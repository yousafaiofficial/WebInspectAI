export class AuditSemaphore {
  private activeCount = 0;
  private waitingQueue: Array<(value: void | PromiseLike<void>) => void> = [];
  
  constructor(public readonly maxConcurrent: number, public readonly maxQueueLength: number) {}

  async acquire(): Promise<boolean> {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return true;
    }

    if (this.waitingQueue.length >= this.maxQueueLength) {
      return false; // Queue full
    }

    return new Promise<boolean>((resolve) => {
      this.waitingQueue.push(() => {
        this.activeCount++;
        resolve(true);
      });
    });
  }

  release(): void {
    if (this.activeCount > 0) {
      this.activeCount--;
    }
    
    const next = this.waitingQueue.shift();
    if (next) {
      next();
    }
  }
}

export const globalAuditSemaphore = new AuditSemaphore(
  parseInt(process.env.MAX_CONCURRENT_AUDITS || "2", 10),
  parseInt(process.env.MAX_WAITING_AUDITS || "5", 10)
);
