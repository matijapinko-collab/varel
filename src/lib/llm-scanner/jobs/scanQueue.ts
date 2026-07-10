import "server-only";

/**
 * Thin scan-queue abstraction. For the MVP it runs jobs inline; the interface
 * exists so heavy Playwright work can be moved to a separate scanner-worker
 * later (Docker/Railway/Fly.io) without changing callers.
 */

export type ScanJob = {
  id: string;
  requestId: string;
  urls: string[];
  mode: "free" | "paid";
  includeScreenshots: boolean;
  includeVisualAnalysis: boolean;
  createdAt: string;
};

/** Runs a job inline. A future worker implementation would push to a queue. */
export async function runScanJob<T>(job: ScanJob, worker: (job: ScanJob) => Promise<T>): Promise<T> {
  return worker(job);
}

/** Runs async tasks with a small concurrency cap (used to bound renders). */
export async function withConcurrency<TItem, TOut>(
  items: TItem[],
  limit: number,
  fn: (item: TItem, index: number) => Promise<TOut>
): Promise<TOut[]> {
  const results: TOut[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
