import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { storage } from '../../storage';
import { TokenUtils } from '../utils/token';
import { notifier } from '../notifications/notifier';
import { AuditLogger, AuditAction, AuditStatus, AuditChannel } from '../models/AuditLog';
import { forgotPasswordSchema, resetPasswordSchema } from '../../../shared/schema';

// Initialize audit logger
const auditLogger = new AuditLogger(storage);

// Environment variables
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const RESET_TOKEN_EXPIRY_MINUTES = 15; // 15 minutes
const MAX_RESET_REQUESTS_PER_DAY = 5; // Maximum reset requests per email per day

// Helper function to get client info
function getClientInfo(req: Request) {
  return {
    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
               req.connection.remoteAddress || 
               'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
}

/**
 * Handle forgot password request
 * Generates a secure reset token and sends email with reset link
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const clientInfo = getClientInfo(req);
  
  try {
    // Validate request body
    const validatedData = forgotPasswordSchema.parse(req.body);
    const { email } = validatedData;

    // Check if user exists
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal whether email exists - always return success
      await auditLogger.log(
        AuditAction.PASSWORD_RESET,
        AuditStatus.FAILURE,
        { 
          ...clientInfo, 
          details: { 
            email: auditLogger['maskEmail'](email), 
            error: 'User not found' 
          } 
        },
        AuditChannel.EMAIL
      );
      
      res.json({
        success: true,
        message: 'If an account with that email exists, we\'ve sent a password reset link.'
      });
      return;
    }

    // Check daily reset limit
    const resetCount = await storage.getPasswordResetCount(email, 24);
    if (resetCount >= MAX_RESET_REQUESTS_PER_DAY) {
      await auditLogger.log(
        AuditAction.RATE_LIMIT_EXCEEDED,
        AuditStatus.BLOCKED,
        { 
          ...clientInfo, 
          details: { 
            email: auditLogger['maskEmail'](email), 
            resetCount,
            limit: MAX_RESET_REQUESTS_PER_DAY
          } 
        },
        AuditChannel.EMAIL
      );

      res.status(429).json({
        error: 'Too many reset requests',
        message: 'You have exceeded the daily limit for password reset requests. Please try again tomorrow.',
        retryAfter: 24 * 60 * 60 // 24 hours in seconds
      });
      return;
    }

    // Generate secure reset token
    const { token, hash } = TokenUtils.generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    // Store reset token hash in database
    const updatedUser = await storage.setPasswordResetToken(email, hash, expiresAt);
    if (!updatedUser) {
      throw new Error('Failed to set reset token');
    }

    // Create reset URL
    const resetUrl = `${CLIENT_URL}/reset-password/${token}`;

    // Send reset email
    try {
      await notifier.sendPasswordResetEmail(email, user.name, resetUrl, RESET_TOKEN_EXPIRY_MINUTES);
      
      // Log successful password reset request
      await auditLogger.log(
        'password_reset_request',
        AuditStatus.SUCCESS,
        { 
          ...clientInfo, 
          userId: user.id,
          details: { 
            email: auditLogger['maskEmail'](email),
            expiresAt: expiresAt.toISOString()
          } 
        },
        AuditChannel.EMAIL
      );

      res.json({
        success: true,
        message: 'If an account with that email exists, we\'ve sent a password reset link.',
        expiresIn: RESET_TOKEN_EXPIRY_MINUTES * 60 // seconds
      });

    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      
      // Clear the reset token since email failed
      await storage.setPasswordResetToken(email, '', new Date());
      
      await auditLogger.log(
        'password_reset_request',
        AuditStatus.FAILURE,
        { 
          ...clientInfo, 
          userId: user.id,
          details: { 
            email: auditLogger['maskEmail'](email), 
            error: 'Email send failed' 
          } 
        },
        AuditChannel.EMAIL
      );

      res.status(500).json({
        error: 'Email delivery failed',
        message: 'Unable to send reset email. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    
    await auditLogger.log(
      'password_reset_request',
      AuditStatus.FAILURE,
      { 
        ...clientInfo, 
        details: { error: (error as Error).message } 
      },
      AuditChannel.EMAIL
    );

    if (error instanceof Error && error.message.includes('validation')) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Please provide a valid email address.'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while processing your request. Please try again.'
      });
    }
  }
}

/**
 * Handle password reset with token
 * Validates token and updates password
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const clientInfo = getClientInfo(req);
  const { token } = req.params;
  
  try {
    // Validate token format
    if (!TokenUtils.isValidTokenFormat(token)) {
      await auditLogger.log(
        'password_reset_attempt',
        AuditStatus.FAILURE,
        { 
          ...clientInfo, 
          details: { error: 'Invalid token format' } 
        }
      );
      
      res.status(400).json({
        error: 'Invalid token',
        message: 'The reset link is invalid or malformed.'
      });
      return;
    }

    // Validate request body
    const validatedData = resetPasswordSchema.parse({
      token,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword
    });

    // Hash the token to find user
    const tokenHash = TokenUtils.hashToken(token);
    const user = await storage.getUserByResetToken(tokenHash);

    if (!user) {
      await auditLogger.log(
        'password_reset_attempt',
        AuditStatus.FAILURE,
        { 
          ...clientInfo, 
          details: { error: 'Token not found or expired' } 
        }
      );
      
      res.status(400).json({
        error: 'Invalid or expired token',
        message: 'The reset link is invalid or has expired. Please request a new one.'
      });
      return;
    }

    // Hash the new password
    const saltRounds = 12; // Higher than default for better security
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

    // Update password and clear reset token
    const updatedUser = await storage.updatePasswordByResetToken(tokenHash, hashedPassword);
    
    if (!updatedUser) {
      throw new Error('Failed to update password');
    }

    // Log successful password reset
    await auditLogger.log(
      'password_reset_complete',
      AuditStatus.SUCCESS,
      { 
        ...clientInfo, 
        userId: user.id,
        details: { 
          email: auditLogger['maskEmail'](user.email),
          resetTime: new Date().toISOString()
        } 
      }
    );

    // Send confirmation email (non-blocking)
    setImmediate(async () => {
      try {
        await notifier.sendPasswordResetConfirmationEmail(user.email, user.name);
      } catch (confirmationError) {
        console.error('Failed to send password reset confirmation:', confirmationError);
      }
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    
    await auditLogger.log(
      'password_reset_attempt',
      AuditStatus.FAILURE,
      { 
        ...clientInfo, 
        details: { error: (error as Error).message } 
      }
    );

    if (error instanceof Error && error.message.includes('validation')) {
      res.status(400).json({
        error: 'Validation error',
        message: 'Please ensure your password meets the requirements and both passwords match.'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while resetting your password. Please try again.'
      });
    }
  }
}

/**
 * Validate reset token without resetting password
 * Useful for frontend to check if token is valid before showing reset form
 */
export async function validateResetToken(req: Request, res: Response): Promise<void> {
  const clientInfo = getClientInfo(req);
  const { token } = req.params;
  
  try {
    // Validate token format
    if (!TokenUtils.isValidTokenFormat(token)) {
      res.status(400).json({
        valid: false,
        error: 'Invalid token format'
      });
      return;
    }

    // Hash the token to find user
    const tokenHash = TokenUtils.hashToken(token);
    const user = await storage.getUserByResetToken(tokenHash);

    if (!user) {
      await auditLogger.log(
        'password_reset_token_validation',
        AuditStatus.FAILURE,
        { 
          ...clientInfo, 
          details: { error: 'Token not found or expired' } 
        }
      );
      
      res.status(400).json({
        valid: false,
        error: 'Token is invalid or has expired'
      });
      return;
    }

    // Calculate time remaining
    const expiresAt = new Date(user.reset_password_expires);
    const timeRemaining = Math.max(0, expiresAt.getTime() - Date.now());

    res.json({
      valid: true,
      expiresIn: Math.floor(timeRemaining / 1000), // seconds
      user: {
        email: auditLogger['maskEmail'](user.email),
        name: user.name
      }
    });

  } catch (error) {
    console.error('Validate reset token error:', error);
    
    res.status(500).json({
      valid: false,
      error: 'An error occurred while validating the token'
    });
  }
}

export default {
  forgotPassword,
  resetPassword,
  validateResetToken
};
