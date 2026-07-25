/**
 * Security Utility: Rate Limiter
 * Implements sliding window rate limiting to throttle API calls and DB writes.
 */

interface RateLimitConfig {
  maxRequests: number; // max allowed calls within windowMs
  windowMs: number;    // window size in milliseconds
}

class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();

  /**
   * Check if an action key is permitted under the rate limit rules.
   * Returns true if allowed, false if limit exceeded.
   */
  public isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const existing = this.timestamps.get(key) || [];
    // Filter timestamps within current window
    const validTimestamps = existing.filter(ts => ts > windowStart);

    if (validTimestamps.length >= config.maxRequests) {
      this.timestamps.set(key, validTimestamps);
      return false;
    }

    validTimestamps.push(now);
    this.timestamps.set(key, validTimestamps);
    return true;
  }

  /**
   * Returns time remaining in seconds until the next request is permitted.
   */
  public getTimeUntilReset(key: string, config: RateLimitConfig): number {
    const now = Date.now();
    const existing = this.timestamps.get(key) || [];
    if (existing.length === 0) return 0;

    const oldestInWindow = existing[0];
    const resetTime = oldestInWindow + config.windowMs;
    return Math.max(0, Math.ceil((resetTime - now) / 1000));
  }

  /**
   * Reset rate limit state for a key.
   */
  public reset(key: string): void {
    this.timestamps.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

// Preconfigured rate limits
export const RATE_LIMIT_PRESETS = {
  AI_REQUEST: { maxRequests: 10, windowMs: 60 * 1000 },    // 10 AI calls per minute
  DB_WRITE: { maxRequests: 30, windowMs: 60 * 1000 },      // 30 DB writes per minute
  AUTH_ATTEMPT: { maxRequests: 5, windowMs: 60 * 1000 }    // 5 login attempts per minute
};
