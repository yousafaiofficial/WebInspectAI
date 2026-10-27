import "server-only";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export type BrowserLauncher = () => Promise<Browser>;

export async function createBrowser() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.CHROME_PATH;
  return chromium.launch({
    headless: true,
    timeout: 15_000,
    executablePath: executablePath || undefined,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
  });
}

export async function withIsolatedPage<T>(task: (page: Page, context: BrowserContext) => Promise<T>, launch: BrowserLauncher = createBrowser): Promise<T> {
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;
  try {
    browser = await launch();
    context = await browser.newContext({ serviceWorkers: "block", javaScriptEnabled: true });
    page = await context.newPage();
    return await task(page, context);
  } finally {
    await page?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}
