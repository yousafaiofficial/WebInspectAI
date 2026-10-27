import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { AuditSemaphore } from "../lib/concurrency/audit-semaphore";

describe("Audit Semaphore", () => {
  test("allows acquiring up to max concurrent slots", async () => {
    const sem = new AuditSemaphore(2, 5);
    assert.equal(await sem.acquire(), true);
    assert.equal(await sem.acquire(), true);
  });

  test("queues requests up to max queue length and rejects when full", async () => {
    const sem = new AuditSemaphore(1, 1);
    await sem.acquire(); // slot 1 taken
    
    let queuedAcquired = false;
    sem.acquire().then(res => { queuedAcquired = res; }); // queued
    
    // Should reject immediately because queue is full
    const rejected = await sem.acquire();
    assert.equal(rejected, false);
    
    sem.release(); // release slot 1, queued should resolve
    
    // Give promise microtask queue time to resolve
    await new Promise(r => setTimeout(r, 0));
    assert.equal(queuedAcquired, true);
  });
});
