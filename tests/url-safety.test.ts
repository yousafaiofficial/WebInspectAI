import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUrl, UrlValidationError } from "../lib/url/normalize-url";
import { isPublicIp, validatePublicUrl, validateRedirectTarget } from "../lib/url/validate-public-url";
import type { HostResolver } from "../lib/url/resolve-host";

const publicResolver: HostResolver = async () => [{ address: "93.184.216.34", family: 4 }];

test("normalizes supported website URLs", () => {
  assert.equal(normalizeUrl("example.com").normalizedUrl, "https://example.com/");
  assert.equal(normalizeUrl("http://example.com").normalizedUrl, "http://example.com/");
  assert.equal(normalizeUrl("www.example.com/about").normalizedUrl, "https://www.example.com/about");
  assert.equal(normalizeUrl("  https://Example.COM/test?q=one#section  ").normalizedUrl, "https://example.com/test?q=one");
});

test("rejects malformed, unsupported and credential-bearing URLs", () => {
  for (const input of ["http://[invalid", "ftp://example.com", "file:///etc/passwd", "https://user:password@example.com"]) {
    assert.throws(() => normalizeUrl(input), UrlValidationError, input);
  }
});

test("accepts public DNS results", async () => {
  const result = await validatePublicUrl("https://example.com/path?q=1", publicResolver);
  assert.equal(result.normalizedUrl, "https://example.com/path?q=1");
  assert.deepEqual(result.addresses, [{ address: "93.184.216.34", family: 4 }]);
});

test("blocks local hostnames and private or reserved IP ranges", async () => {
  const blocked = [
    "http://localhost", "http://api.localhost", "http://127.0.0.1", "http://10.0.0.8",
    "http://172.16.4.2", "http://192.168.1.10", "http://169.254.169.254", "http://0.0.0.0",
    "http://[::1]", "http://[fe80::1]", "http://[fc00::1]",
  ];
  for (const input of blocked) {
    await assert.rejects(validatePublicUrl(input, publicResolver), (error: unknown) => error instanceof UrlValidationError && error.code === "BLOCKED_TARGET", input);
  }
});

test("blocks a hostname if any DNS answer is private", async () => {
  const mixedResolver: HostResolver = async () => [
    { address: "93.184.216.34", family: 4 },
    { address: "10.0.0.2", family: 4 },
  ];
  await assert.rejects(validatePublicUrl("https://example.com", mixedResolver), (error: unknown) => error instanceof UrlValidationError && error.code === "BLOCKED_TARGET");
});

test("reports deterministic DNS failures", async () => {
  const failedResolver: HostResolver = async () => { throw new Error("not found"); };
  await assert.rejects(validatePublicUrl("https://missing.example", failedResolver), (error: unknown) => error instanceof UrlValidationError && error.code === "DNS_FAILED");
});

test("validates redirect destinations with the same SSRF policy", async () => {
  await assert.rejects(
    validateRedirectTarget("http://127.0.0.1/admin", new URL("https://example.com"), publicResolver),
    (error: unknown) => error instanceof UrlValidationError && error.code === "BLOCKED_TARGET",
  );
});

test("IP classifier permits public addresses and rejects special-use addresses", () => {
  assert.equal(isPublicIp("8.8.8.8"), true);
  assert.equal(isPublicIp("2606:4700:4700::1111"), true);
  assert.equal(isPublicIp("224.0.0.1"), false);
  assert.equal(isPublicIp("2001:db8::1"), false);
  assert.equal(isPublicIp("::ffff:127.0.0.1"), false);
});
