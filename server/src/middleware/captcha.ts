import { Request, Response, NextFunction } from 'express';
import { captchaSchema } from '../../../shared/schema';

// Environment variables for CAPTCHA
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET;
const CAPTCHA_PROVIDER = process.env.CAPTCHA_PROVIDER || 'hcaptcha'; // 'hcaptcha' or 'turnstile'

/**
 * CAPTCHA verification middleware
 * Supports both hCaptcha and Cloudflare Turnstile
 */
export class CaptchaMiddleware {
  private static captchaSecret = CAPTCHA_SECRET;
  private static provider = CAPTCHA_PROVIDER;

  /**
   * Verify CAPTCHA token with the configured provider
   */
  private static async verifyCaptchaToken(token: string, userIP: string): Promise<boolean> {
    if (!this.captchaSecret) {
      console.warn('CAPTCHA_SECRET not configured - skipping verification in development');
      return process.env.NODE_ENV === 'development'; // Allow in dev, block in prod
    }

    try {
      let verifyUrl: string;
      let formData: URLSearchParams;

      if (this.provider === 'turnstile') {
        // Cloudflare Turnstile
        verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        formData = new URLSearchParams({
          secret: this.captchaSecret,
          response: token,
          remoteip: userIP
        });
      } else {
        // hCaptcha (default)
        verifyUrl = 'https://hcaptcha.com/siteverify';
        formData = new URLSearchParams({
          secret: this.captchaSecret,
          response: token,
          remoteip: userIP
        });
      }

      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      const result = await response.json();
      
      // Both hCaptcha and Turnstile return success boolean
      return result.success === true;

    } catch (error) {
      console.error('CAPTCHA verification error:', error);
      return false;
    }
  }

  /**
   * Extract client IP address from request
   */
  private static getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.headers['x-real-ip'] as string ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  /**
   * Middleware function to verify CAPTCHA
   */
  static middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip CAPTCHA in test environment
        if (process.env.NODE_ENV === 'test') {
          return next();
        }

        // Skip if CAPTCHA is disabled
        if (process.env.CAPTCHA_DISABLED === 'true') {
          console.warn('CAPTCHA verification disabled via CAPTCHA_DISABLED environment variable');
          return next();
        }

        // Validate request body contains CAPTCHA token
        const validation = captchaSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            error: 'CAPTCHA verification required',
            message: 'Please complete the CAPTCHA challenge.',
            details: validation.error.errors.map(e => e.message)
          });
        }

        const { captchaToken } = validation.data;
        const clientIP = this.getClientIP(req);

        // Verify CAPTCHA token
        const isValid = await this.verifyCaptchaToken(captchaToken, clientIP);

        if (!isValid) {
          console.warn(`CAPTCHA verification failed for IP: ${clientIP}`);
          
          return res.status(400).json({
            error: 'CAPTCHA verification failed',
            message: 'Invalid CAPTCHA. Please try again.',
            code: 'CAPTCHA_INVALID'
          });
        }

        // CAPTCHA verified successfully, continue to next middleware
        console.log(`CAPTCHA verified successfully for IP: ${clientIP}`);
        next();

      } catch (error) {
        console.error('CAPTCHA middleware error:', error);
        
        res.status(500).json({
          error: 'CAPTCHA verification error',
          message: 'An error occurred while verifying CAPTCHA. Please try again.'
        });
      }
    };
  }

  /**
   * Middleware for optional CAPTCHA (when rate limiting is exceeded)
   */
  static optionalMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // If no CAPTCHA token provided, skip verification
      if (!req.body.captchaToken) {
        return next();
      }

      // If CAPTCHA token is provided, verify it
      return this.middleware()(req, res, next);
    };
  }

  /**
   * Create a conditional CAPTCHA middleware based on user attempts
   */
  static conditionalMiddleware(getAttemptCount: (req: Request) => Promise<number>, threshold: number = 3) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const attempts = await getAttemptCount(req);
        
        // If attempts exceed threshold, require CAPTCHA
        if (attempts >= threshold) {
          return this.middleware()(req, res, next);
        }

        // Otherwise, skip CAPTCHA verification
        next();
      } catch (error) {
        console.error('Conditional CAPTCHA middleware error:', error);
        // On error, require CAPTCHA as fallback
        return this.middleware()(req, res, next);
      }
    };
  }

  /**
   * Get CAPTCHA configuration for frontend
   */
  static getConfig() {
    return {
      provider: this.provider,
      enabled: !!this.captchaSecret && process.env.CAPTCHA_DISABLED !== 'true',
      siteKey: process.env.CAPTCHA_SITE_KEY || '',
    };
  }
}

// Export individual functions for backwards compatibility
export const verifyCaptcha = CaptchaMiddleware.middleware;
export const optionalCaptcha = CaptchaMiddleware.optionalMiddleware;
export const conditionalCaptcha = CaptchaMiddleware.conditionalMiddleware;

export default CaptchaMiddleware;
