/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sleep with random jitter to avoid thundering herd
 * @param baseMs Base delay in milliseconds
 * @param jitterMs Maximum additional random delay
 */
export async function sleepWithJitter(baseMs: number, jitterMs: number = 100): Promise<void> {
  const jitter = Math.random() * jitterMs;
  await sleep(baseMs + jitter);
}

/**
 * Rate limiter that enforces minimum delay between calls
 */
export class RateLimiter {
  private lastCallTime = 0;
  
  constructor(
    private minDelayMs: number,
    private jitterMs: number = 100
  ) {}
  
  /**
   * Wait if needed to respect rate limit
   */
  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallTime;
    const remaining = this.minDelayMs - elapsed;
    
    if (remaining > 0) {
      await sleepWithJitter(remaining, this.jitterMs);
    } else {
      // Even if no delay needed, add small jitter to avoid bursts
      await sleepWithJitter(0, this.jitterMs);
    }
    
    this.lastCallTime = Date.now();
  }
}
