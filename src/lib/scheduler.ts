// A single shared semaphore so that "concurrency" in Settings means the true
// number of simultaneous HTTP requests in flight — whether they come from one
// huge file being chunked or from several files being translated at once.

type Task<T> = () => Promise<T>

class ConcurrencyScheduler {
  private concurrency: number
  private active = 0
  private queue: (() => void)[] = []

  constructor(concurrency: number) {
    this.concurrency = Math.max(1, concurrency)
  }

  setConcurrency(n: number) {
    this.concurrency = Math.max(1, n)
    this.drain()
  }

  async run<T>(task: Task<T>): Promise<T> {
    await this.acquire()
    try {
      return await task()
    } finally {
      this.release()
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.concurrency) {
      this.active += 1
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active += 1
        resolve()
      })
    })
  }

  private release() {
    this.active = Math.max(0, this.active - 1)
    this.drain()
  }

  private drain() {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const next = this.queue.shift()
      next?.()
    }
  }
}

export const globalScheduler = new ConcurrencyScheduler(5)
