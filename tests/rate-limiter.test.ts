import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { MemoryRateLimiter } from "../lib/rate-limit/rate-limiter";

describe("Rate Limiter", () => {
  test("allows requests under the limit", async () => {
    const limiter = new MemoryRateLimiter(2, 60);
    const result1 = await limiter.check("client1");
    assert.equal(result1.allowed, true);
    assert.equal(result1.remaining, 1);
    
    const result2 = await limiter.check("client1");
    assert.equal(result2.allowed, true);
    assert.equal(result2.remaining, 0);
  });

  test("blocks requests over the limit", async () => {
    const limiter = new MemoryRateLimiter(1, 60);
    await limiter.check("client2");
    
    const result2 = await limiter.check("client2");
    assert.equal(result2.allowed, false);
    assert.equal(result2.remaining, 0);
  });

  test("maintains separate limits per client", async () => {
    const limiter = new MemoryRateLimiter(1, 60);
    await limiter.check("client3");
    
    const result2 = await limiter.check("client4");
    assert.equal(result2.allowed, true);
  });

  test("resets after window expires", async () => {
    const limiter = new MemoryRateLimiter(1, -1); // Negative window means instant reset
    await limiter.check("client5");
    
    // Hack for test: wait 1ms to ensure Date.now() advances past the negative window
    await new Promise(r => setTimeout(r, 10));
    
    const result2 = await limiter.check("client5");
    assert.equal(result2.allowed, true);
  });
});
