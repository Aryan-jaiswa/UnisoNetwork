import crypto from 'crypto';

export interface OtpHashResult {
  hash: string;
  salt: string;
}

export interface OtpVerificationResult {
  isValid: boolean;
  shouldLock: boolean;
  attemptsRemaining: number;
}

/**
 * Secure OTP utilities using SHA-256 with HMAC and salt
 */
export class OtpSecurity {
  private static readonly HASH_ALGORITHM = 'sha256';
  private static readonly SALT_LENGTH = 32; // 256 bits
  private static readonly HASH_ITERATIONS = 10000; // PBKDF2 iterations

  /**
   * Generate a cryptographically secure random salt
   */
  static generateSalt(): string {
    return crypto.randomBytes(this.SALT_LENGTH).toString('hex');
  }

  /**
   * Hash an OTP with salt using PBKDF2
   */
  static hashOtp(otp: string, salt?: string): OtpHashResult {
    const finalSalt = salt || this.generateSalt();
    const hash = crypto.pbkdf2Sync(
      otp,
      finalSalt,
      this.HASH_ITERATIONS,
      64, // 512 bits output
      this.HASH_ALGORITHM
    ).toString('hex');

    return {
      hash,
      salt: finalSalt
    };
  }

  /**
   * Verify OTP using constant-time comparison
   */
  static verifyOtp(enteredOtp: string, storedHash: string, salt: string): boolean {
    try {
      const computedHash = crypto.pbkdf2Sync(
        enteredOtp,
        salt,
        this.HASH_ITERATIONS,
        64,
        this.HASH_ALGORITHM
      ).toString('hex');

      // Constant-time comparison to prevent timing attacks
      return this.constantTimeEquals(computedHash, storedHash);
    } catch (error) {
      console.error('OTP verification error:', error);
      return false;
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate a secure 6-digit OTP
   */
  static generateOtp(): string {
    // Use crypto.randomInt for secure random number generation
    const min = 100000; // 6-digit minimum
    const max = 999999; // 6-digit maximum
    return crypto.randomInt(min, max + 1).toString();
  }

  /**
   * Calculate if account should be locked based on attempts
   */
  static shouldLockAccount(attempts: number, maxAttempts: number): boolean {
    return attempts >= maxAttempts;
  }

  /**
   * Calculate lock duration based on attempt count (exponential backoff)
   */
  static calculateLockDuration(attempts: number): number {
    // Base lock time: 15 minutes
    const baseLockMinutes = 15;
    // Exponential backoff: 2^(attempts - maxAttempts) * base
    const multiplier = Math.pow(2, Math.max(0, attempts - 5));
    return baseLockMinutes * multiplier * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Check if resend cooldown period has passed
   */
  static canResend(lastSentAt: Date, cooldownMinutes: number = 1): boolean {
    const now = new Date();
    const cooldownMs = cooldownMinutes * 60 * 1000;
    return (now.getTime() - lastSentAt.getTime()) >= cooldownMs;
  }

  /**
   * Check daily limit for OTP sends
   */
  static checkDailyLimit(sentToday: number, dailyLimit: number = 10): boolean {
    return sentToday < dailyLimit;
  }

  /**
   * Generate a secure session token for additional verification
   */
  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create HMAC signature for request validation
   */
  static createHmacSignature(data: string, secret: string): string {
    return crypto.createHmac(this.HASH_ALGORITHM, secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  static verifyHmacSignature(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createHmacSignature(data, secret);
    return this.constantTimeEquals(signature, expectedSignature);
  }

  /**
   * Hash IP address for privacy (one-way hash for rate limiting)
   */
  static hashIpAddress(ip: string, salt: string): string {
    return crypto.createHmac(this.HASH_ALGORITHM, salt)
      .update(ip)
      .digest('hex');
  }

  /**
   * Generate rate limiting key
   */
  static generateRateLimitKey(ip: string, route: string, userId?: number): string {
    const baseKey = `${ip}:${route}`;
    return userId ? `${baseKey}:${userId}` : baseKey;
  }
}
