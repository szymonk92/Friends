/**
 * Rate Limiter for AI Extraction
 *
 * Implements a sliding window rate limiter to prevent API abuse and
 * protect against unexpected costs.
 *
 * SECURITY:
 * - Prevents runaway API calls from bugs or user error
 * - Protects against API key abuse if compromised
 * - Provides clear feedback on rate limit status
 *
 * Limits (configurable):
 * - 10 requests per minute
 * - 100 requests per hour
 * - 500 requests per day
 */

export interface RateLimitConfig {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  remainingMinute: number;
  remainingHour: number;
  remainingDay: number;
  retryAfterSeconds?: number;
  nextWindowReset: {
    minute: number;
    hour: number;
    day: number;
  };
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxPerMinute: 10,
  maxPerHour: 100,
  maxPerDay: 500,
};

// Time constants
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export class ExtractionRateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Clean up old requests outside the daily window
   */
  private cleanupOldRequests(): void {
    const now = Date.now();
    const dayAgo = now - DAY_MS;
    this.requests = this.requests.filter((timestamp) => timestamp > dayAgo);
  }

  /**
   * Count requests within a time window
   */
  private countRequestsInWindow(windowMs: number): number {
    const now = Date.now();
    const windowStart = now - windowMs;
    return this.requests.filter((timestamp) => timestamp > windowStart).length;
  }

  /**
   * Get the earliest request timestamp that would need to expire for a new request
   */
  private getEarliestExpiry(windowMs: number, maxRequests: number): number | null {
    const now = Date.now();
    const windowStart = now - windowMs;
    const requestsInWindow = this.requests.filter((timestamp) => timestamp > windowStart);

    if (requestsInWindow.length < maxRequests) {
      return null;
    }

    // Sort ascending and get the oldest request that's still in the window
    requestsInWindow.sort((a, b) => a - b);
    const oldestInWindow = requestsInWindow[0];

    // Return when this request will expire from the window
    return oldestInWindow + windowMs;
  }

  /**
   * Check if a new request is allowed
   */
  checkLimit(): RateLimitStatus {
    this.cleanupOldRequests();

    const now = Date.now();
    const minuteCount = this.countRequestsInWindow(MINUTE_MS);
    const hourCount = this.countRequestsInWindow(HOUR_MS);
    const dayCount = this.countRequestsInWindow(DAY_MS);

    const remainingMinute = Math.max(0, this.config.maxPerMinute - minuteCount);
    const remainingHour = Math.max(0, this.config.maxPerHour - hourCount);
    const remainingDay = Math.max(0, this.config.maxPerDay - dayCount);

    const allowed = remainingMinute > 0 && remainingHour > 0 && remainingDay > 0;

    // Calculate retry time if rate limited
    let retryAfterSeconds: number | undefined;
    if (!allowed) {
      const minuteExpiry = this.getEarliestExpiry(MINUTE_MS, this.config.maxPerMinute);
      const hourExpiry = this.getEarliestExpiry(HOUR_MS, this.config.maxPerHour);
      const dayExpiry = this.getEarliestExpiry(DAY_MS, this.config.maxPerDay);

      // Find the soonest expiry time
      const expiryTimes = [minuteExpiry, hourExpiry, dayExpiry].filter(
        (t): t is number => t !== null
      );

      if (expiryTimes.length > 0) {
        const soonestExpiry = Math.min(...expiryTimes);
        retryAfterSeconds = Math.ceil((soonestExpiry - now) / 1000);
      }
    }

    // Calculate when each window resets
    const nextWindowReset = {
      minute: remainingMinute > 0 ? 0 : this.getSecondsUntilWindowReset(MINUTE_MS),
      hour: remainingHour > 0 ? 0 : this.getSecondsUntilWindowReset(HOUR_MS),
      day: remainingDay > 0 ? 0 : this.getSecondsUntilWindowReset(DAY_MS),
    };

    return {
      allowed,
      remainingMinute,
      remainingHour,
      remainingDay,
      retryAfterSeconds,
      nextWindowReset,
    };
  }

  /**
   * Get seconds until a request expires from a window
   */
  private getSecondsUntilWindowReset(windowMs: number): number {
    if (this.requests.length === 0) return 0;

    const now = Date.now();
    const windowStart = now - windowMs;
    const requestsInWindow = this.requests.filter((t) => t > windowStart);

    if (requestsInWindow.length === 0) return 0;

    // Find the oldest request in the window
    const oldestInWindow = Math.min(...requestsInWindow);
    const expiresAt = oldestInWindow + windowMs;

    return Math.max(0, Math.ceil((expiresAt - now) / 1000));
  }

  /**
   * Record a new request
   */
  recordRequest(): void {
    this.cleanupOldRequests();
    this.requests.push(Date.now());
  }

  /**
   * Get current status without modifying state
   */
  getStatus(): RateLimitStatus {
    return this.checkLimit();
  }

  /**
   * Reset the rate limiter (for testing or admin purposes)
   */
  reset(): void {
    this.requests = [];
  }

  /**
   * Update configuration (for testing or admin purposes)
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }
}
