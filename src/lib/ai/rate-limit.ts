
// Per-provider RPM ceiling + exponential backoff on 429 — docs/DECISIONS.md
// "M2 — free-tier providers". Free tiers WILL 429 mid-batch; this makes that
// a pause-and-retry instead of a lost call. In-memory only — fine for a
// single Next.js dev process / eval script, not a multi-instance deployment.

interface QueueState {
  lastRequestAt: number;
  minIntervalMs: number;
}

const queues = new Map<string, QueueState>();

function getQueue(provider: string, rpm: number): QueueState {
  let q = queues.get(provider);
  if (!q) {
    q = { lastRequestAt: 0, minIntervalMs: 60_000 / rpm };
    queues.set(provider, q);
  } else {
    q.minIntervalMs = 60_000 / rpm;
  }
  return q;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Spaces out calls to `provider` so they never exceed `rpm` requests/minute. */
export async function throttle(provider: string, rpm: number): Promise<void> {
  const q = getQueue(provider, rpm);
  const now = Date.now();
  const wait = q.lastRequestAt + q.minIntervalMs - now;
  if (wait > 0) await sleep(wait);
  q.lastRequestAt = Date.now();
}

export class RateLimitedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitedError";
  }
}

/**
 * Runs `fn`, retrying on 429s with exponential backoff + jitter. `isRateLimit`
 * lets each provider decide how it signals a 429 (HTTP status, error message).
 * After `maxRetries`, throws RateLimitedError so the caller can mark the
 * stage_run failed and degrade rather than crash (CLAUDE.md rule 8).
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  isRateLimit: (err: unknown) => boolean,
  maxRetries = 5
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (!isRateLimit(err) || attempt >= maxRetries) {
        if (isRateLimit(err)) {
          throw new RateLimitedError(`rate limited after ${attempt} retries: ${String(err)}`);
        }
        throw err;
      }
      const backoffMs = Math.min(30_000, 1000 * 2 ** attempt) + Math.random() * 500;
      await sleep(backoffMs);
      attempt += 1;
    }
  }
}
