/**
 * Rate Limiter Tests
 *
 * Tests for the AI extraction rate limiter including:
 * - Per-minute limits
 * - Per-hour limits
 * - Per-day limits
 * - Sliding window behavior
 * - Status reporting
 */

import { ExtractionRateLimiter, type RateLimitConfig } from '../rate-limiter';

describe('ExtractionRateLimiter', () => {
  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 5, maxPerHour: 100, maxPerDay: 500 });

      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        const status = limiter.checkLimit();
        expect(status.allowed).toBe(true);
        limiter.recordRequest();
      }
    });

    it('should block requests when minute limit exceeded', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 3, maxPerHour: 100, maxPerDay: 500 });

      // Make 3 requests (at the limit)
      for (let i = 0; i < 3; i++) {
        limiter.recordRequest();
      }

      // 4th request should be blocked
      const status = limiter.checkLimit();
      expect(status.allowed).toBe(false);
      expect(status.remainingMinute).toBe(0);
    });

    it('should report correct remaining counts', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 10, maxPerHour: 100, maxPerDay: 500 });

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        limiter.recordRequest();
      }

      const status = limiter.getStatus();
      expect(status.remainingMinute).toBe(7);
      expect(status.remainingHour).toBe(97);
      expect(status.remainingDay).toBe(497);
    });
  });

  describe('Default Configuration', () => {
    it('should use default limits of 10/min, 100/hr, 500/day', () => {
      const limiter = new ExtractionRateLimiter();
      const config = limiter.getConfig();

      expect(config.maxPerMinute).toBe(10);
      expect(config.maxPerHour).toBe(100);
      expect(config.maxPerDay).toBe(500);
    });

    it('should allow partial configuration override', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 5 });
      const config = limiter.getConfig();

      expect(config.maxPerMinute).toBe(5);
      expect(config.maxPerHour).toBe(100); // default
      expect(config.maxPerDay).toBe(500); // default
    });
  });

  describe('Status Reporting', () => {
    it('should report allowed: true when under limits', () => {
      const limiter = new ExtractionRateLimiter();
      const status = limiter.getStatus();

      expect(status.allowed).toBe(true);
      expect(status.remainingMinute).toBe(10);
      expect(status.remainingHour).toBe(100);
      expect(status.remainingDay).toBe(500);
    });

    it('should report retryAfterSeconds when rate limited', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 2, maxPerHour: 100, maxPerDay: 500 });

      limiter.recordRequest();
      limiter.recordRequest();

      const status = limiter.checkLimit();
      expect(status.allowed).toBe(false);
      expect(status.retryAfterSeconds).toBeDefined();
      expect(status.retryAfterSeconds).toBeGreaterThan(0);
      expect(status.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it('should include nextWindowReset times', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 1, maxPerHour: 100, maxPerDay: 500 });

      limiter.recordRequest();

      const status = limiter.checkLimit();
      expect(status.nextWindowReset).toBeDefined();
      expect(status.nextWindowReset.minute).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all counters', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 2, maxPerHour: 100, maxPerDay: 500 });

      // Exceed limit
      limiter.recordRequest();
      limiter.recordRequest();

      let status = limiter.checkLimit();
      expect(status.allowed).toBe(false);

      // Reset
      limiter.reset();

      status = limiter.checkLimit();
      expect(status.allowed).toBe(true);
      expect(status.remainingMinute).toBe(2);
    });
  });

  describe('Configuration Updates', () => {
    it('should allow updating configuration', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 5, maxPerHour: 50, maxPerDay: 200 });

      limiter.updateConfig({ maxPerMinute: 10 });

      const config = limiter.getConfig();
      expect(config.maxPerMinute).toBe(10);
      expect(config.maxPerHour).toBe(50); // unchanged
      expect(config.maxPerDay).toBe(200); // unchanged
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero requests correctly', () => {
      const limiter = new ExtractionRateLimiter();
      const status = limiter.getStatus();

      expect(status.allowed).toBe(true);
      expect(status.retryAfterSeconds).toBeUndefined();
    });

    it('should handle exactly at limit', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 3, maxPerHour: 100, maxPerDay: 500 });

      limiter.recordRequest();
      limiter.recordRequest();

      // At limit but not exceeded
      let status = limiter.checkLimit();
      expect(status.allowed).toBe(true);
      expect(status.remainingMinute).toBe(1);

      limiter.recordRequest();

      // Now exceeded
      status = limiter.checkLimit();
      expect(status.allowed).toBe(false);
      expect(status.remainingMinute).toBe(0);
    });

    it('should handle hour limit independently of minute limit', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 100, maxPerHour: 5, maxPerDay: 500 });

      // Make 5 requests (within minute limit, at hour limit)
      for (let i = 0; i < 5; i++) {
        limiter.recordRequest();
      }

      const status = limiter.checkLimit();
      expect(status.allowed).toBe(false);
      expect(status.remainingMinute).toBe(95); // still have minute capacity
      expect(status.remainingHour).toBe(0); // hour limit hit
    });

    it('should handle day limit independently', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 100, maxPerHour: 100, maxPerDay: 3 });

      // Make 3 requests (within minute/hour limit, at day limit)
      for (let i = 0; i < 3; i++) {
        limiter.recordRequest();
      }

      const status = limiter.checkLimit();
      expect(status.allowed).toBe(false);
      expect(status.remainingDay).toBe(0);
    });
  });

  describe('Multiple Limit Interactions', () => {
    it('should report the most restrictive limit', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 2, maxPerHour: 5, maxPerDay: 10 });

      // Make 2 requests (hit minute limit)
      limiter.recordRequest();
      limiter.recordRequest();

      const status = limiter.checkLimit();
      expect(status.allowed).toBe(false);
      expect(status.remainingMinute).toBe(0);
      expect(status.remainingHour).toBe(3);
      expect(status.remainingDay).toBe(8);
    });
  });

  describe('Thread Safety Simulation', () => {
    it('should handle rapid sequential requests', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 100, maxPerHour: 1000, maxPerDay: 5000 });

      // Simulate rapid requests
      for (let i = 0; i < 50; i++) {
        const status = limiter.checkLimit();
        expect(status.allowed).toBe(true);
        limiter.recordRequest();
      }

      const finalStatus = limiter.getStatus();
      expect(finalStatus.remainingMinute).toBe(50);
    });
  });

  describe('Real-World Scenarios', () => {
    it('Scenario: Normal user making occasional extractions', () => {
      const limiter = new ExtractionRateLimiter();

      // User makes 3 extractions over the course of a session
      for (let i = 0; i < 3; i++) {
        const status = limiter.checkLimit();
        expect(status.allowed).toBe(true);
        limiter.recordRequest();
      }

      const status = limiter.getStatus();
      expect(status.remainingMinute).toBe(7);
      expect(status.remainingHour).toBe(97);
      expect(status.remainingDay).toBe(497);
    });

    it('Scenario: Power user hitting minute limit', () => {
      const limiter = new ExtractionRateLimiter();

      // User makes 10 rapid extractions
      for (let i = 0; i < 10; i++) {
        limiter.recordRequest();
      }

      const status = limiter.checkLimit();
      expect(status.allowed).toBe(false);
      expect(status.remainingMinute).toBe(0);
      expect(status.remainingHour).toBe(90); // still have hourly capacity
    });

    it('Scenario: Preventing runaway extraction loop', () => {
      const limiter = new ExtractionRateLimiter({ maxPerMinute: 5, maxPerHour: 20, maxPerDay: 50 });

      let successfulExtractions = 0;
      let blockedExtractions = 0;

      // Simulate a buggy loop that tries to extract 100 times
      for (let i = 0; i < 100; i++) {
        const status = limiter.checkLimit();
        if (status.allowed) {
          limiter.recordRequest();
          successfulExtractions++;
        } else {
          blockedExtractions++;
        }
      }

      // Should have been limited to minute limit
      expect(successfulExtractions).toBe(5);
      expect(blockedExtractions).toBe(95);
    });
  });
});
