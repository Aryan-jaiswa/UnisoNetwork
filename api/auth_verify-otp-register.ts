import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { storage } from '../server/storage';
import { otpVerificationSchema } from '../shared/schema';
import { notifier } from '../server/src/notifications/notifier';
import { OtpSecurity } from '../server/src/security/otpSecurity';
import { AuditLogger, AuditAction, AuditStatus, AuditChannel, AuditPurpose } from '../server/src/models/AuditLog';

// Initialize audit logger
const auditLogger = new AuditLogger(storage);

// Helper function to get client info
function getClientInfo(req: VercelRequest) {
  return {
    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
               req.headers['x-real-ip'] as string ||
               'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const clientInfo = getClientInfo(req);
    
    try {
      const { name, email, phone, password_hash, otp_code, otp_type, purpose = 'signup' } = req.body;
      
      if (!name || !email || !password_hash || !otp_code || !otp_type) {
        await auditLogger.log(
          AuditAction.OTP_VERIFY_FAIL,
          AuditStatus.FAILURE,
          { ...clientInfo, details: { error: 'Missing required fields' } }
        );
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Determine contact info and channel
      const contactInfo = otp_type === 'email' ? email : phone;
      const channel = otp_type === 'email' ? 'email' : 'sms';
      
      if (!contactInfo) {
        await auditLogger.log(
          AuditAction.OTP_VERIFY_FAIL,
          AuditStatus.FAILURE,
          { ...clientInfo, details: { error: 'Missing contact info', otp_type } }
        );
        return res.status(400).json({ message: 'Contact information is required' });
      }

      // Get OTP record
      const otpRecord = await storage.getOtpRecord(contactInfo, channel, purpose);
      if (!otpRecord) {
        await auditLogger.logOtpVerify(
          contactInfo,
          channel as AuditChannel,
          purpose as AuditPurpose,
          AuditStatus.FAILURE,
          { ...clientInfo, details: { error: 'OTP not found or expired' } }
        );
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }

      // Check if OTP is locked due to too many attempts
      const isLocked = await storage.isOtpLocked(otpRecord.id);
      if (isLocked) {
        await auditLogger.logAccountLock(
          contactInfo,
          channel as AuditChannel,
          purpose as AuditPurpose,
          clientInfo,
          15
        );
        return res.status(423).json({ 
          message: 'Too many failed attempts. Please try again later.',
          code: 'ACCOUNT_LOCKED'
        });
      }

      // Verify OTP using constant-time comparison
      const isValidOtp = OtpSecurity.verifyOtp(otp_code, otpRecord.otp_hash, otpRecord.salt);
      
      if (!isValidOtp) {
        // Increment attempts and check for lockout
        const { attempts, shouldLock } = await storage.incrementOtpAttempts(otpRecord.id);
        
        await auditLogger.logOtpVerify(
          contactInfo,
          channel as AuditChannel,
          purpose as AuditPurpose,
          AuditStatus.FAILURE,
          { ...clientInfo, details: { attempts, shouldLock } },
          attempts
        );

        if (shouldLock) {
          await auditLogger.logAccountLock(
            contactInfo,
            channel as AuditChannel,
            purpose as AuditPurpose,
            clientInfo,
            15
          );
          return res.status(423).json({ 
            message: 'Too many failed attempts. Account locked for 15 minutes.',
            code: 'ACCOUNT_LOCKED'
          });
        }

        const remainingAttempts = otpRecord.max_attempts - attempts;
        return res.status(400).json({ 
          message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
          attemptsRemaining: remainingAttempts
        });
      }

      // OTP verified successfully - proceed with registration
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        await auditLogger.log(
          AuditAction.USER_REGISTER,
          AuditStatus.FAILURE,
          { ...clientInfo, details: { error: 'Email already exists', email } }
        );
        return res.status(409).json({ message: 'An account with this email already exists' });
      }

      // Hash password
      const hashed = await bcrypt.hash(password_hash, 10);

      // Create user with verified status
      const user = await storage.createUser({
        name,
        email,
        phone: phone || null,
        password_hash: hashed,
        is_verified: true, // Mark as verified since OTP was successful
        avatar_url: null
      });

      // Clear OTP after successful verification
      await storage.clearOtpRecord(contactInfo, channel, purpose);

      // Log successful verification and registration
      await auditLogger.logOtpVerify(
        contactInfo,
        channel as AuditChannel,
        purpose as AuditPurpose,
        AuditStatus.SUCCESS,
        { ...clientInfo, userId: user.id }
      );

      await auditLogger.logUserRegistration(
        user.id,
        user.email,
        AuditChannel.API,
        AuditStatus.SUCCESS,
        clientInfo
      );

      // Send welcome email (non-blocking)
      setTimeout(async () => {
        try {
          await notifier.sendWelcomeEmail(user.email, user.name);
        } catch (welcomeError) {
          console.error('Failed to send welcome email:', welcomeError);
        }
      }, 0);

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar_url: user.avatar_url,
          is_verified: user.is_verified
        }
      });
    } catch (err) {
      console.error('OTP verification and registration error:', err);
      
      await auditLogger.log(
        AuditAction.OTP_VERIFY_FAIL,
        AuditStatus.FAILURE,
        { ...clientInfo, details: { error: (err as Error).message } }
      );

      res.status(500).json({
        message: 'An error occurred during verification. Please try again.',
        ...(process.env.NODE_ENV === 'development' && { error: (err as Error).message })
      });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
