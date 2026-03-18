import { auditLogSchema } from '../../../shared/schema';
import { z } from 'zod';

export type AuditLogData = z.infer<typeof auditLogSchema>;

export interface AuditContext {
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  purpose?: AuditPurpose;
  channel?: AuditChannel;
}

export enum AuditAction {
  // OTP Actions
  OTP_SEND = 'otp_send',
  OTP_VERIFY = 'otp_verify',
  OTP_VERIFY_FAIL = 'otp_verify_fail',
  OTP_RESEND = 'otp_resend',
  OTP_EXPIRED = 'otp_expired',
  OTP_LOCKED = 'otp_locked',
  OTP_RATE_LIMITED = 'otp_rate_limited',
  
  // Authentication Actions
  USER_REGISTER = 'user_register',
  USER_LOGIN = 'user_login',
  USER_LOGIN_FAIL = 'user_login_fail',
  USER_LOGOUT = 'user_logout',
  
  // Password Reset Actions
  PASSWORD_RESET = 'password_reset',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_COMPLETE = 'password_reset_complete',
  PASSWORD_RESET_ATTEMPT = 'password_reset_attempt',
  PASSWORD_RESET_TOKEN_VALIDATION = 'password_reset_token_validation',
  PASSWORD_CHANGE = 'password_change',
  
  // Security Events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCOUNT_LOCKED = 'account_locked',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_TOKEN = 'invalid_token',
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  BLOCKED = 'blocked',
}

export enum AuditChannel {
  EMAIL = 'email',
  SMS = 'sms',
}

export enum AuditPurpose {
  SIGNUP = 'signup',
  LOGIN = 'login',
  RESET = 'reset',
}

/**
 * Audit logging service for security events
 */
export class AuditLogger {
  private storage: any; // Will be injected in constructor

  constructor(storage: any) {
    this.storage = storage;
  }

  /**
   * Log a security event
   */
  async log(
    action: AuditAction | string,
    status: AuditStatus,
    context: AuditContext = {},
    channel?: AuditChannel,
    purpose?: AuditPurpose
  ): Promise<void> {
    try {
      const auditData: AuditLogData = {
        user_id: context.userId,
        action,
        channel,
        purpose,
        status,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        details: context.details ? JSON.stringify(context.details) : undefined,
      };

      // Validate data against schema
      const validatedData = auditLogSchema.parse(auditData);

      // Store in database
      await this.storage.createAuditLog(validatedData);

      // Log to console for development/debugging
      this.logToConsole(action, status, context, channel, purpose);
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Log OTP send event
   */
  async logOtpSend(
    contactInfo: string,
    channel: AuditChannel,
    purpose: AuditPurpose,
    status: AuditStatus,
    context: AuditContext = {}
  ): Promise<void> {
    await this.log(
      AuditAction.OTP_SEND,
      status,
      {
        ...context,
        details: {
          ...context.details,
          contactInfo: this.maskContactInfo(contactInfo),
          timestamp: new Date().toISOString(),
        }
      },
      channel,
      purpose
    );
  }

  /**
   * Log OTP verification attempt
   */
  async logOtpVerify(
    contactInfo: string,
    channel: AuditChannel,
    purpose: AuditPurpose,
    status: AuditStatus,
    context: AuditContext = {},
    attempts?: number
  ): Promise<void> {
    const action = status === AuditStatus.SUCCESS ? 
      AuditAction.OTP_VERIFY : 
      AuditAction.OTP_VERIFY_FAIL;

    await this.log(
      action,
      status,
      {
        ...context,
        details: {
          ...context.details,
          contactInfo: this.maskContactInfo(contactInfo),
          attempts,
          timestamp: new Date().toISOString(),
        }
      },
      channel,
      purpose
    );
  }

  /**
   * Log account lockout
   */
  async logAccountLock(
    contactInfo: string,
    channel: AuditChannel,
    purpose: AuditPurpose,
    context: AuditContext = {},
    lockDurationMinutes?: number
  ): Promise<void> {
    await this.log(
      AuditAction.OTP_LOCKED,
      AuditStatus.BLOCKED,
      {
        ...context,
        details: {
          ...context.details,
          contactInfo: this.maskContactInfo(contactInfo),
          lockDurationMinutes,
          timestamp: new Date().toISOString(),
        }
      },
      channel,
      purpose
    );
  }

  /**
   * Log rate limiting event
   */
  async logRateLimit(
    rateLimitKey: string,
    context: AuditContext = {}
  ): Promise<void> {
    await this.log(
      AuditAction.RATE_LIMIT_EXCEEDED,
      AuditStatus.BLOCKED,
      {
        ...context,
        details: {
          ...context.details,
          rateLimitKey,
          timestamp: new Date().toISOString(),
        }
      }
    );
  }

  /**
   * Log user registration
   */
  async logUserRegistration(
    userId: number,
    email: string,
    channel: AuditChannel,
    status: AuditStatus,
    context: AuditContext = {}
  ): Promise<void> {
    await this.log(
      AuditAction.USER_REGISTER,
      status,
      {
        ...context,
        userId,
        details: {
          ...context.details,
          email: this.maskEmail(email),
          timestamp: new Date().toISOString(),
        }
      },
      channel,
      AuditPurpose.SIGNUP
    );
  }

  /**
   * Get audit logs for a user (with pagination)
   */
  async getUserAuditLogs(
    userId: number,
    limit: number = 50,
    offset: number = 0,
    actions?: AuditAction[]
  ): Promise<any[]> {
    try {
      return await this.storage.getUserAuditLogs(userId, limit, offset, actions);
    } catch (error) {
      console.error('Failed to fetch user audit logs:', error);
      return [];
    }
  }

  /**
   * Get security alerts (failed attempts, locked accounts, etc.)
   */
  async getSecurityAlerts(
    hours: number = 24,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const alertActions = [
        AuditAction.OTP_VERIFY_FAIL,
        AuditAction.OTP_LOCKED,
        AuditAction.RATE_LIMIT_EXCEEDED,
        AuditAction.SUSPICIOUS_ACTIVITY,
      ];
      
      return await this.storage.getAuditLogsByActions(
        alertActions,
        hours,
        limit
      );
    } catch (error) {
      console.error('Failed to fetch security alerts:', error);
      return [];
    }
  }

  /**
   * Mask contact information for privacy
   */
  public maskContactInfo(contactInfo: string, channel?: AuditChannel): string {
    if (contactInfo.includes('@')) {
      // Email
      const [local, domain] = contactInfo.split('@');
      const maskedLocal = local.length > 2 ? 
        local.substring(0, 2) + '*'.repeat(local.length - 2) : 
        local;
      return `${maskedLocal}@${domain}`;
    } else {
      // Phone number
      const cleaned = contactInfo.replace(/\D/g, '');
      if (cleaned.length >= 10) {
        return `${cleaned.substring(0, 3)}-***-${cleaned.substring(cleaned.length - 4)}`;
      }
      return '***-***-' + cleaned.substring(cleaned.length - 4);
    }
  }

  /**
   * Mask email for logging
   */
  public maskEmail(email: string): string {
    return this.maskContactInfo(email);
  }

  /**
   * Console logging for development
   */
  private logToConsole(
    action: string,
    status: AuditStatus,
    context: AuditContext,
    channel?: AuditChannel,
    purpose?: AuditPurpose
  ): void {
    const timestamp = new Date().toISOString();
    const statusEmoji = status === AuditStatus.SUCCESS ? '✅' : 
                       status === AuditStatus.FAILURE ? '❌' : '🚫';
    
    console.log(`${statusEmoji} [AUDIT] ${timestamp} - ${action}`, {
      status,
      channel,
      purpose,
      userId: context.userId,
      ip: context.ipAddress?.substring(0, 8) + '***', // Partial IP for privacy
      details: context.details
    });
  }
}
