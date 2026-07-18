// Minimal in-memory fixed-window rate limiter. Suitable for the current
// single-process deployment; a shared store (e.g. Redis) is required if the
// API ever runs on more than one instance. On serverless (Vercel) each
// instance has its own window, so limits there are per-instance best-effort.

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number
  ) {}

  /** Returns true when the request is allowed. */
  check(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      // Opportunistic cleanup keeps the map from growing unbounded.
      if (this.buckets.size > 10_000) {
        for (const [k, b] of this.buckets) {
          if (b.resetAt <= now) this.buckets.delete(k);
        }
      }
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (bucket.count >= this.max) return false;
    bucket.count += 1;
    return true;
  }

  reset(): void {
    this.buckets.clear();
  }
}
