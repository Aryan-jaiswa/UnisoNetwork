import { Router } from 'express';
import { storage } from '../../storage';
import { AuditLogger } from '../models/AuditLog';
import { RateLimiters } from '../middleware/rateLimit';
import authController from '../controllers/authController';

// Initialize dependencies
const auditLogger = new AuditLogger(storage);

// Create rate limiters for auth operations
const forgotPasswordLimiter = RateLimiters.createAuthLimiter(storage, auditLogger);
const resetPasswordLimiter = RateLimiters.createAuthLimiter(storage, auditLogger);

// Create router
const router = Router();

/**
 * @route   POST /auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 * @body    { email: string }
 */
router.post('/forgot-password', 
  forgotPasswordLimiter.middleware(),
  authController.forgotPassword
);

/**
 * @route   POST /auth/reset-password/:token
 * @desc    Reset password with token
 * @access  Public
 * @params  token - Reset token from email
 * @body    { password: string, confirmPassword: string }
 */
router.post('/reset-password/:token', 
  resetPasswordLimiter.middleware(),
  authController.resetPassword
);

/**
 * @route   GET /auth/validate-reset-token/:token
 * @desc    Validate reset token without resetting password
 * @access  Public
 * @params  token - Reset token to validate
 */
router.get('/validate-reset-token/:token', 
  authController.validateResetToken
);

export default router;
