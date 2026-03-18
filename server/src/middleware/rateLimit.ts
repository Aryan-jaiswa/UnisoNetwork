import { Request, Response, NextFunction } from 'express';
import { OtpSecurity } from '../security/otpSecurity';
import { AuditLogger, AuditAction, AuditStatus } from '../models/AuditLog';

export interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Max requests per window
  keyGenerator?: (req: Request) => string;  // Custom key generation
  skipSuccessfulRequests?: boolean;         // Don't count successful requests
  skipFailedRequests?: boolean;             // Don't count failed requests
  message?: string;        // Custom error message
  statusCode?: number;     // HTTP status code for rate limit exceeded
  headers?: boolean;       // Include rate limit headers in response
}

export interface RateLimitInfo {
  key: string;
  requests: number;
  windowStart: Date;
  expiresAt: Date;
  remaining: number;
  resetTime: Date;
}

/**
 * Rate limiting middleware with sliding window algorithm
 */
export class RateLimit {
  private config: Required<RateLimitConfig>;
  private storage: any;
  private auditLogger: AuditLogger;

  constructor(
    config: RateLimitConfig,
    storage: any,
    auditLogger: AuditLogger
  ) {
    this.config = {
      keyGenerator: (req: Request) => this.defaultKeyGenerator(req),
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later',
      statusCode: 429,
      headers: true,
      ...config
    };
    this.storage = storage;
    this.auditLogger = auditLogger;
  }

  /**
   * Default key generator: IP + route
   */
  private defaultKeyGenerator(req: Request): string {
    const ip = this.getClientIp(req);
    const route = req.route?.path || req.path;
    return OtpSecurity.generateRateLimitKey(ip, route);
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Get user agent from request
   */
  private getUserAgent(req: Request): string {
    return req.headers['user-agent'] || 'unknown';
  }

  /**
   * Create rate limit middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.config.keyGenerator(req);
        const now = new Date();
        
        // Get current rate limit info
        const rateLimitInfo = await this.getRateLimitInfo(key, now);
        
        // Check if limit exceeded
        if (rateLimitInfo.requests >= this.config.maxRequests) {
          // Log rate limit exceeded
          await this.auditLogger.logRateLimit(key, {
            ipAddress: this.getClientIp(req),
            userAgent: this.getUserAgent(req),
            details: {
              route: req.path,
              method: req.method,
              requests: rateLimitInfo.requests,
              limit: this.config.maxRequests,
              windowMs: this.config.windowMs
            }
          });

          // Add rate limit headers
          if (this.config.headers) {
            this.addRateLimitHeaders(res, rateLimitInfo);
          }

          return res.status(this.config.statusCode).json({
            error: 'Rate limit exceeded',
            message: this.config.message,
            retryAfter: Math.ceil((rateLimitInfo.resetTime.getTime() - now.getTime()) / 1000)
          });
        }

        // Increment request count
        await this.incrementCounter(key, now);

        // Add rate limit headers
        if (this.config.headers) {
          const updatedInfo = {
            ...rateLimitInfo,
            requests: rateLimitInfo.requests + 1,
            remaining: Math.max(0, this.config.maxRequests - rateLimitInfo.requests - 1)
          };
          this.addRateLimitHeaders(res, updatedInfo);
        }

        // Attach rate limit info to request for use in route handlers
        (req as any).rateLimit = {
          ...rateLimitInfo,
          remaining: Math.max(0, this.config.maxRequests - rateLimitInfo.requests - 1)
        };

        next();
      } catch (error) {
        console.error('Rate limit middleware error:', error);
        // Don't block requests if rate limiting fails
        next();
      }
    };
  }

  /**
   * Get current rate limit information
   */
  private async getRateLimitInfo(key: string, now: Date): Promise<RateLimitInfo> {
    try {
      const existing = await this.storage.getRateLimit(key);
      
      if (!existing || now > new Date(existing.expires_at)) {
        // No existing record or expired - create new window
        const windowStart = now;
        const expiresAt = new Date(now.getTime() + this.config.windowMs);
        
        return {
          key,
          requests: 0,
          windowStart,
          expiresAt,
          remaining: this.config.maxRequests,
          resetTime: expiresAt
        };
      }

      // Check if we need to slide the window
      const windowStart = new Date(existing.window_start);
      const timeSinceStart = now.getTime() - windowStart.getTime();
      
      if (timeSinceStart >= this.config.windowMs) {
        // Slide the window
        const newWindowStart = now;
        const newExpiresAt = new Date(now.getTime() + this.config.windowMs);
        
        return {
          key,
          requests: 0,
          windowStart: newWindowStart,
          expiresAt: newExpiresAt,
          remaining: this.config.maxRequests,
          resetTime: newExpiresAt
        };
      }

      // Within current window
      return {
        key,
        requests: existing.requests,
        windowStart,
        expiresAt: new Date(existing.expires_at),
        remaining: Math.max(0, this.config.maxRequests - existing.requests),
        resetTime: new Date(existing.expires_at)
      };
    } catch (error) {
      console.error('Error getting rate limit info:', error);
      // Return permissive defaults on error
      return {
        key,
        requests: 0,
        windowStart: now,
        expiresAt: new Date(now.getTime() + this.config.windowMs),
        remaining: this.config.maxRequests,
        resetTime: new Date(now.getTime() + this.config.windowMs)
      };
    }
  }

  /**
   * Increment request counter
   */
  private async incrementCounter(key: string, now: Date): Promise<void> {
    try {
      const windowStart = now;
      const expiresAt = new Date(now.getTime() + this.config.windowMs);
      
      await this.storage.incrementRateLimit(key, windowStart, expiresAt);
    } catch (error) {
      console.error('Error incrementing rate limit counter:', error);
      // Don't throw - we don't want to block requests if rate limiting fails
    }
  }

  /**
   * Add rate limit headers to response
   */
  private addRateLimitHeaders(res: Response, info: RateLimitInfo): void {
    res.set({
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': info.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(info.resetTime.getTime() / 1000).toString(),
      'X-RateLimit-Window': Math.ceil(this.config.windowMs / 1000).toString()
    });
  }

  /**
   * Reset rate limit for a specific key (admin function)
   */
  async resetRateLimit(key: string): Promise<void> {
    try {
      await this.storage.deleteRateLimit(key);
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      throw error;
    }
  }

  /**
   * Get rate limit status for a key
   */
  async getRateLimitStatus(key: string): Promise<RateLimitInfo | null> {
    try {
      return await this.getRateLimitInfo(key, new Date());
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export class RateLimiters {
  static createOtpRequestLimiter(storage: any, auditLogger: AuditLogger): RateLimit {
    return new RateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 OTP requests per 15 minutes per IP
      message: 'Too many OTP requests. Please try again later.',
    }, storage, auditLogger);
  }

  static createOtpVerifyLimiter(storage: any, auditLogger: AuditLogger): RateLimit {
    return new RateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 20, // 20 verification attempts per 15 minutes per IP
      message: 'Too many verification attempts. Please try again later.',
    }, storage, auditLogger);
  }

  static createApiLimiter(storage: any, auditLogger: AuditLogger): RateLimit {
    return new RateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // 100 API requests per 15 minutes per IP
      message: 'Too many API requests. Please try again later.',
    }, storage, auditLogger);
  }

  static createAuthLimiter(storage: any, auditLogger: AuditLogger): RateLimit {
    return new RateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10, // 10 auth attempts per 15 minutes per IP
      message: 'Too many authentication attempts. Please try again later.',
      keyGenerator: (req: Request) => {
        // Include email/phone in rate limit key for auth routes
        const ip = req.headers['x-forwarded-for'] as string || req.connection.remoteAddress;
        const identifier = req.body?.email || req.body?.phone || '';
        return `auth:${ip}:${identifier}`;
      }
    }, storage, auditLogger);
  }
}

export default RateLimit;
