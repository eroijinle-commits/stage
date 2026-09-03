/**
 * Simple request queue with max concurrency and exponential backoff on 429.
 * @module lib/stake-api/rate-limiter
 */

const MAX_CONCURRENT = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

interface QueueEntry {
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

let activeCount = 0;
const queue: QueueEntry[] = [];

/**
 * Schedule an async function through the rate limiter.
 * Returns a promise that resolves/rejects when the function completes.
 */
export async function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const entry: QueueEntry = {
      fn: fn as () => Promise<unknown>,
      resolve: resolve as (v: unknown) => void,
      reject,
    };

    if (activeCount < MAX_CONCURRENT) {
      run(entry);
    } else {
      queue.push(entry);
    }
  });
}

async function run(entry: QueueEntry): Promise<void> {
  activeCount++;
  try {
    const result = await entry.fn();
    entry.resolve(result);
  } catch (err) {
    entry.reject(err);
  } finally {
    activeCount--;
    if (queue.length > 0) {
      const next = queue.shift()!;
      run(next);
    }
  }
}

/**
 * Compute exponential backoff delay from attempt number (0-indexed).
 * @param attempt Current attempt number (0 = first retry)
 * @param retryAfter Optional server-provided Retry-After value in seconds
 */
export function computeBackoff(attempt: number, retryAfter?: number): number {
  if (retryAfter && retryAfter > 0) {
    return Math.min(retryAfter * 1000, MAX_DELAY_MS);
  }
  const delay = BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay, MAX_DELAY_MS);
}

/**
 * Sleep helper.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reset state — useful for tests. */
export function resetRateLimiter(): void {
  activeCount = 0;
  queue.length = 0;
}
