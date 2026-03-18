import crypto from 'crypto';

export interface ResetTokenResult {
  token: string;
  hash: string;
}

/**
 * Secure token generation utilities for password reset functionality
 */
export class TokenUtils {
  private static readonly TOKEN_LENGTH = 32; // 256 bits
  private static readonly HASH_ALGORITHM = 'sha256';

  /**
   * Generate a secure password reset token
   * @returns Object containing the plain token and its hash
   */
  static generateResetToken(): ResetTokenResult {
    // Generate cryptographically secure random token
    const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
    
    // Create SHA-256 hash of the token for database storage
    const hash = crypto.createHash(this.HASH_ALGORITHM)
      .update(token)
      .digest('hex');

    return {
      token, // Send this to user via email
      hash   // Store this in database
    };
  }

  /**
   * Hash a token for database lookup
   * @param token - The plain token to hash
   * @returns SHA-256 hash of the token
   */
  static hashToken(token: string): string {
    return crypto.createHash(this.HASH_ALGORITHM)
      .update(token)
      .digest('hex');
  }

  /**
   * Generate a secure session token
   * @param length - Token length in bytes (default: 32)
   * @returns Hex-encoded random token
   */
  static generateSessionToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure verification code (alternative to OTP)
   * @param length - Code length (default: 6 digits)
   * @returns Numeric verification code
   */
  static generateVerificationCode(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return crypto.randomInt(min, max + 1).toString();
  }

  /**
   * Create a time-based token that includes expiration
   * @param expiresInMinutes - Token validity in minutes
   * @returns Object with token, hash, and expiration timestamp
   */
  static generateTimedToken(expiresInMinutes: number = 15): ResetTokenResult & { expiresAt: Date } {
    const { token, hash } = this.generateResetToken();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    return {
      token,
      hash,
      expiresAt
    };
  }

  /**
   * Validate token format (hex string of expected length)
   * @param token - Token to validate
   * @param expectedLength - Expected token length in characters (default: 64 for 32-byte hex)
   * @returns True if token format is valid
   */
  static isValidTokenFormat(token: string, expectedLength: number = 64): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    if (token.length !== expectedLength) {
      return false;
    }

    // Check if it's a valid hex string
    return /^[a-f0-9]+$/i.test(token);
  }

  /**
   * Generate a secure API key
   * @param prefix - Optional prefix for the API key
   * @returns API key with optional prefix
   */
  static generateApiKey(prefix?: string): string {
    const key = crypto.randomBytes(32).toString('hex');
    return prefix ? `${prefix}_${key}` : key;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use TokenUtils.generateResetToken() instead
 */
export function generateResetToken(): ResetTokenResult {
  return TokenUtils.generateResetToken();
}

export default TokenUtils;
