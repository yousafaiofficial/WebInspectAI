export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTimeMs: number;
}

export interface RateLimiter {
  check(identifier: string): Promise<RateLimitResult>;
}

export class MemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetTimeMs: number }>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxEntries: number;

  constructor(limit: number, windowSeconds: number, maxEntries = 10_000) {
    this.limit = limit;
    this.windowMs = windowSeconds * 1000;
    this.maxEntries = maxEntries;
  }

  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    let record = this.store.get(identifier);

    if (!record || now > record.resetTimeMs) {
      if (this.store.size >= this.maxEntries) {
        this.cleanup(now);
      }
      record = { count: 0, resetTimeMs: now + this.windowMs };
    }

    const allowed = record.count < this.limit;
    if (allowed) {
      record.count += 1;
    }

    this.store.set(identifier, record);

    return {
      allowed,
      limit: this.limit,
      remaining: Math.max(0, this.limit - record.count),
      resetTimeMs: record.resetTimeMs,
    };
  }

  private cleanup(now: number) {
    this.store.forEach((value, key) => {
      if (now > value.resetTimeMs) {
        this.store.delete(key);
      }
    });
    if (this.store.size >= this.maxEntries) {
      const keys = Array.from(this.store.keys());
      const toRemove = Math.floor(this.maxEntries / 4);
      for (let i = 0; i < toRemove && i < keys.length; i++) {
        this.store.delete(keys[i]);
      }
    }
  }
}
