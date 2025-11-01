export class RateLimiter {
  private last = 0;

  constructor(private readonly minDelayMs: number, private readonly jitterMs: number) {}

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.last;
    const waitFor = Math.max(0, this.minDelayMs - elapsed);
    const jitter = Math.random() * this.jitterMs;
    if (waitFor + jitter > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitFor + jitter));
    }
    this.last = Date.now();
  }
}
