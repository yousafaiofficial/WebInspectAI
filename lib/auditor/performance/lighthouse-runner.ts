import "server-only";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { chromium, type Browser, type BrowserContext } from "playwright";
import type { HostResolver } from "../../url/resolve-host";
import { resolveHost } from "../../url/resolve-host";
import { validatePublicUrl } from "../../url/validate-public-url";
import { PerformanceAuditError } from "./lighthouse-errors";
import { PERFORMANCE_LIMITS, PERFORMANCE_PROFILE } from "./performance-rules";
import type { LighthouseResultLike } from "./performance-types";

type ChromeHandle = { port: number; stop: () => Promise<void> };
type SafetyHandle = { getBlockedRequests: () => number; getUnsafeNavigation: () => string | undefined; close: () => Promise<void> };
type LighthouseExecution = (url: string, port: number) => Promise<LighthouseResultLike | undefined>;

export type LighthouseRunnerDependencies = {
  resolver?: HostResolver;
  totalTimeoutMs?: number;
  launchChrome?: () => Promise<ChromeHandle>;
  attachSafety?: (port: number, resolver: HostResolver) => Promise<SafetyHandle>;
  executeLighthouse?: LighthouseExecution;
};

async function availablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForChrome(port: number, process: ChildProcess) {
  const deadline = Date.now() + PERFORMANCE_LIMITS.chromeLaunchTimeoutMs;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new PerformanceAuditError("BROWSER_LAUNCH_FAILED");
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch { /* Chromium is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new PerformanceAuditError("BROWSER_LAUNCH_FAILED");
}

function getChromiumExecutablePath(): string {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }
  return chromium.executablePath();
}

async function defaultLaunchChrome(): Promise<ChromeHandle> {
  const port = await availablePort();
  const profileDirectory = await mkdtemp(join(tmpdir(), "webinspectai-lighthouse-"));
  let process: ChildProcess | undefined;
  try {
    const executable = getChromiumExecutablePath();
    process = spawn(executable, [
      "--headless=new", `--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${profileDirectory}`, "--no-first-run", "--no-default-browser-check",
      "--disable-background-networking", "--disable-component-update", "--disable-default-apps",
      "--disable-dev-shm-usage", "--disable-domain-reliability", "--disable-sync", "--metrics-recording-only",
      "--no-sandbox",
    ], { stdio: "ignore", windowsHide: true });
    await waitForChrome(port, process);
  } catch (error) {
    process?.kill();
    await rm(profileDirectory, { recursive: true, force: true }).catch(() => undefined);
    if (error instanceof PerformanceAuditError) throw error;
    throw new PerformanceAuditError("BROWSER_LAUNCH_FAILED");
  }
  let stopped = false;
  return {
    port,
    stop: async () => {
      if (stopped) return;
      stopped = true;
      if (process && process.exitCode === null) {
        process.kill();
        await Promise.race([
          new Promise<void>((resolve) => process!.once("exit", () => resolve())),
          new Promise<void>((resolve) => setTimeout(resolve, 2_000)),
        ]);
      }
      await rm(profileDirectory, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

async function defaultAttachSafety(port: number, resolver: HostResolver): Promise<SafetyHandle> {
  let browser: Browser;
  try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 10_000 }); }
  catch (error) { throw new PerformanceAuditError("LIGHTHOUSE_INITIALIZATION_FAILED", undefined, { cause: error }); }
  const context: BrowserContext | undefined = browser.contexts()[0];
  if (!context) { await browser.close().catch(() => undefined); throw new PerformanceAuditError("LIGHTHOUSE_INITIALIZATION_FAILED"); }
  let blockedRequests = 0;
  let unsafeNavigation: string | undefined;
  const validationCache = new Map<string, Promise<boolean>>();
  const validate = (url: URL) => {
    const key = `${url.protocol}//${url.hostname}:${url.port}`;
    let result = validationCache.get(key);
    if (!result) {
      result = validatePublicUrl(url, resolver).then(() => true, () => false);
      validationCache.set(key, result);
    }
    return result;
  };
  await context.route("**/*", async (route) => {
    const request = route.request();
    let destination: URL;
    try { destination = new URL(request.url()); }
    catch { blockedRequests += 1; await route.abort("blockedbyclient"); return; }
    if (!["http:", "https:"].includes(destination.protocol) || !["GET", "HEAD"].includes(request.method())) {
      blockedRequests += 1;
      if (request.isNavigationRequest()) unsafeNavigation = request.url();
      await route.abort("blockedbyclient");
      return;
    }
    if (!await validate(destination)) {
      blockedRequests += 1;
      if (request.isNavigationRequest()) unsafeNavigation = request.url();
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  return {
    getBlockedRequests: () => blockedRequests,
    getUnsafeNavigation: () => unsafeNavigation,
    close: () => browser.close().catch(() => undefined),
  };
}

async function defaultExecuteLighthouse(url: string, port: number) {
  let lighthouse: typeof import("lighthouse")["default"];
  try { ({ default: lighthouse } = await import("lighthouse")); }
  catch (error) { throw new PerformanceAuditError("LIGHTHOUSE_INITIALIZATION_FAILED", undefined, { cause: error }); }
  const result = await lighthouse(url, {
    port,
    hostname: "127.0.0.1",
    logLevel: "silent",
    output: "json",
    onlyCategories: ["performance"],
    formFactor: PERFORMANCE_PROFILE.formFactor,
    screenEmulation: PERFORMANCE_PROFILE.screenEmulation,
    throttlingMethod: PERFORMANCE_PROFILE.throttlingMethod,
    maxWaitForLoad: 30_000,
    maxWaitForFcp: 20_000,
    disableFullPageScreenshot: true,
  });
  return result?.lhr as LighthouseResultLike | undefined;
}

export async function runLighthouse(url: string, dependencies: LighthouseRunnerDependencies = {}) {
  const started = performance.now();
  const totalTimeoutMs = dependencies.totalTimeoutMs ?? PERFORMANCE_LIMITS.totalTimeoutMs;
  const resolver = dependencies.resolver || resolveHost;
  let chrome: ChromeHandle | undefined;
  let safety: SafetyHandle | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    chrome = await (dependencies.launchChrome || defaultLaunchChrome)();
    safety = await (dependencies.attachSafety || defaultAttachSafety)(chrome.port, resolver);
    const remainingMs = Math.max(1, totalTimeoutMs - (performance.now() - started));
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new PerformanceAuditError("AUDIT_TIMEOUT")), remainingMs);
    });
    let lhr: LighthouseResultLike | undefined;
    try { lhr = await Promise.race([(dependencies.executeLighthouse || defaultExecuteLighthouse)(url, chrome.port), deadline]); }
    catch (error) {
      if (error instanceof PerformanceAuditError) throw error;
      const message = error instanceof Error ? error.message : "";
      if (/navigation|document request|failed_document|no_fcp/i.test(message)) throw new PerformanceAuditError("NAVIGATION_FAILED");
      throw new PerformanceAuditError("LIGHTHOUSE_AUDIT_FAILED");
    }
    if (safety.getUnsafeNavigation()) throw new PerformanceAuditError("UNSAFE_NAVIGATION_BLOCKED");
    if (!lhr) throw new PerformanceAuditError("INVALID_LIGHTHOUSE_RESULT");
    return { lhr, durationMs: Math.round(performance.now() - started), blockedRequests: safety.getBlockedRequests() };
  } finally {
    if (timer) clearTimeout(timer);
    await safety?.close().catch(() => undefined);
    await chrome?.stop().catch(() => undefined);
  }
}
