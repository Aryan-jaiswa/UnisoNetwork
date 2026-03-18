import dotenv from 'dotenv';
import { EmailProvider, SmsProvider } from './types';
import { SendGridProvider } from './email/sendgridProvider';
import { TwilioProvider } from './sms/twilioProvider';

// Load environment variables
dotenv.config();

export class Notifier {
  public readonly email: EmailProvider;
  public readonly sms: SmsProvider;

  constructor() {
    // Initialize email provider
    const sendgridApiKey = process.env.SENDGRID_API_KEY || '';
    const fromEmail = process.env.FROM_EMAIL || '';
    
    this.email = new SendGridProvider(sendgridApiKey, fromEmail);

    // Initialize SMS provider
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || '';
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER || '';
    
    this.sms = new TwilioProvider(twilioAccountSid, twilioAuthToken, twilioFromNumber);

    // Log configuration status
    this.logConfigurationStatus();
  }

  private logConfigurationStatus(): void {
    const emailConfigured = !!(process.env.SENDGRID_API_KEY && process.env.FROM_EMAIL);
    const smsConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);

    console.log('📧 Notification System Configuration:');
    console.log(`   Email (SendGrid): ${emailConfigured ? '✅ Configured' : '⚠️  Not configured (will use console logging)'}`);
    console.log(`   SMS (Twilio): ${smsConfigured ? '✅ Configured' : '⚠️  Not configured (will use console logging)'}`);
    
    if (!emailConfigured) {
      console.log('   💡 Set SENDGRID_API_KEY and FROM_EMAIL to enable email sending');
    }
    
    if (!smsConfigured) {
      console.log('   💡 Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to enable SMS sending');
    }
  }

  // Convenience method for sending OTP emails
  async sendOtpEmail(email: string, otp: string, appName: string = 'Uniso'): Promise<void> {
    await this.email.send({
      to: email,
      subject: `Your ${appName} Verification Code`,
      text: `Your verification code is: ${otp}. This code will expire in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Your ${appName} Verification Code</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 4px;">${otp}</h1>
          </div>
          <p style="color: #666; text-align: center;">
            Enter this code to complete your registration. This code will expire in 5 minutes.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      `
    });
  }

  // Convenience method for sending OTP SMS
  async sendOtpSms(phone: string, otp: string, appName: string = 'Uniso'): Promise<void> {
    await this.sms.send({
      to: phone,
      body: `Your ${appName} verification code is: ${otp}. This code will expire in 5 minutes.`
    });
  }

  // Convenience method for sending welcome emails
  async sendWelcomeEmail(email: string, name: string, appName: string = 'Uniso'): Promise<void> {
    await this.email.send({
      to: email,
      subject: `Welcome to ${appName}!`,
      text: `Hi ${name}, welcome to ${appName}! Your account has been successfully created.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to ${appName}, ${name}! 🎉</h2>
          <p style="color: #666;">
            Your account has been successfully created and verified. You can now access all features of ${appName}.
          </p>
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0;">Get Started</h3>
            <p style="margin: 10px 0 0 0;">Explore our platform and connect with the community!</p>
          </div>
          <p style="color: #999; font-size: 12px;">
            If you have any questions, feel free to reach out to our support team.
          </p>
        </div>
      `
    });
  }

  // Convenience method for sending password reset emails
  async sendPasswordResetEmail(email: string, name: string, resetUrl: string, expiryMinutes: number = 15, appName: string = 'Uniso'): Promise<void> {
    await this.email.send({
      to: email,
      subject: `Reset Your ${appName} Password`,
      text: `Hi ${name}, you requested a password reset for your ${appName} account. Click this link to reset your password: ${resetUrl}. This link will expire in ${expiryMinutes} minutes. If you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset Your ${appName} Password 🔐</h2>
          <p style="color: #666;">Hi ${name},</p>
          <p style="color: #666;">
            You requested a password reset for your ${appName} account. Click the button below to create a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link in your browser:<br>
            <a href="${resetUrl}" style="color: #007bff; word-break: break-all;">${resetUrl}</a>
          </p>
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              ⚠️ <strong>Security Notice:</strong> This link will expire in ${expiryMinutes} minutes. 
              If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </p>
          </div>
          <p style="color: #999; font-size: 12px;">
            If you continue to have problems, please contact our support team.
          </p>
        </div>
      `
    });
  }

  // Convenience method for sending password reset confirmation emails
  async sendPasswordResetConfirmationEmail(email: string, name: string, appName: string = 'Uniso'): Promise<void> {
    await this.email.send({
      to: email,
      subject: `Your ${appName} Password Has Been Reset`,
      text: `Hi ${name}, your ${appName} password has been successfully reset. If you didn't make this change, please contact our support team immediately.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Successful ✅</h2>
          <p style="color: #666;">Hi ${name},</p>
          <p style="color: #666;">
            Your ${appName} password has been successfully reset. You can now log in with your new password.
          </p>
          <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="color: #155724; margin: 0; font-size: 14px;">
              ✅ <strong>Password Updated:</strong> ${new Date().toLocaleString()}
            </p>
          </div>
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="color: #721c24; margin: 0; font-size: 14px;">
              🚨 <strong>Security Alert:</strong> If you didn't make this change, please contact our support team immediately. 
              Someone may have unauthorized access to your account.
            </p>
          </div>
          <p style="color: #666;">
            For your security, we recommend:
          </p>
          <ul style="color: #666;">
            <li>Using a strong, unique password</li>
            <li>Enabling two-factor authentication if available</li>
            <li>Not sharing your login credentials</li>
          </ul>
          <p style="color: #999; font-size: 12px;">
            If you have any questions or concerns, please contact our support team.
          </p>
        </div>
      `
    });
  }

  // Convenience method for sending suspicious activity alerts
  async sendSuspiciousActivityAlert(email: string, name: string, attemptCount: number, timeWindow: string, appName: string = 'Uniso'): Promise<void> {
    await this.email.send({
      to: email,
      subject: `🚨 Security Alert - Suspicious Login Activity on ${appName}`,
      text: `Hi ${name}, we detected ${attemptCount} failed login attempts on your ${appName} account in the past ${timeWindow}. If this wasn't you, please reset your password immediately and enable two-factor authentication.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🚨 Security Alert</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Suspicious Activity Detected</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 18px; margin-bottom: 20px;">Hi ${name},</p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #856404; margin: 0 0 10px 0;">⚠️ Multiple Failed Login Attempts</h3>
              <p style="color: #856404; margin: 0; font-size: 16px;">
                We detected <strong>${attemptCount} failed login attempts</strong> on your ${appName} account 
                in the past <strong>${timeWindow}</strong>.
              </p>
            </div>

            <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #0c5460; margin: 0 0 15px 0;">🛡️ Immediate Action Required</h3>
              <p style="color: #0c5460; margin: 0 0 15px 0;">If this wasn't you, someone may be trying to access your account:</p>
              <ol style="color: #0c5460; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;"><strong>Reset your password immediately</strong></li>
                <li style="margin-bottom: 8px;"><strong>Enable two-factor authentication</strong></li>
                <li style="margin-bottom: 8px;"><strong>Review your account activity</strong></li>
                <li style="margin-bottom: 8px;"><strong>Contact support if you notice anything suspicious</strong></li>
              </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/reset-password" 
                 style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Reset Password Now
              </a>
            </div>

            <div style="background: #e2e3e5; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #495057; margin: 0 0 10px 0;">Security Details:</h4>
              <ul style="color: #6c757d; margin: 0; padding-left: 20px; font-size: 14px;">
                <li>Failed attempts: ${attemptCount}</li>
                <li>Time window: ${timeWindow}</li>
                <li>Detection time: ${new Date().toLocaleString()}</li>
                <li>Account status: Secure (no unauthorized access)</li>
              </ul>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              <strong>Was this you?</strong> If you were trying to log in and forgot your password, 
              you can safely ignore this alert after resetting your password.
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #dee2e6; padding-top: 15px;">
              This is an automated security alert from ${appName}. If you have any questions, 
              please contact our support team. We take your account security seriously.
            </p>
          </div>
        </div>
      `
    });
  }

  // Convenience method for sending account lockout notifications
  async sendAccountLockoutAlert(email: string, name: string, lockDuration: string, appName: string = 'Uniso'): Promise<void> {
    await this.email.send({
      to: email,
      subject: `🔒 Account Temporarily Locked - ${appName}`,
      text: `Hi ${name}, your ${appName} account has been temporarily locked for ${lockDuration} due to multiple failed login attempts. This is a security measure to protect your account.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #ffc107; color: #212529; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🔒 Account Locked</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Security Protection Activated</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 18px; margin-bottom: 20px;">Hi ${name},</p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #856404; margin: 0 0 15px 0;">🔒 Account Temporarily Locked</h3>
              <p style="color: #856404; margin: 0; font-size: 16px;">
                Your ${appName} account has been temporarily locked for <strong>${lockDuration}</strong> 
                due to multiple failed login attempts.
              </p>
            </div>

            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #155724; margin: 0 0 15px 0;">✅ Your Account is Safe</h3>
              <p style="color: #155724; margin: 0;">
                This is an automatic security measure to protect your account from unauthorized access attempts. 
                No data has been compromised.
              </p>
            </div>

            <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #0c5460; margin: 0 0 15px 0;">⏰ What Happens Next</h3>
              <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Your account will automatically unlock after ${lockDuration}</li>
                <li style="margin-bottom: 8px;">You can then try logging in again</li>
                <li style="margin-bottom: 8px;">Consider resetting your password if you forgot it</li>
                <li style="margin-bottom: 8px;">Enable 2FA for additional security</li>
              </ul>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              <strong>Need immediate access?</strong> If you're locked out and need urgent access, 
              please contact our support team with your account details.
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #dee2e6; padding-top: 15px;">
              Lockout time: ${new Date().toLocaleString()} | 
              Duration: ${lockDuration} | 
              Reason: Multiple failed login attempts
            </p>
          </div>
        </div>
      `
    });
  }
}

// Export a singleton instance
export const notifier = new Notifier();
