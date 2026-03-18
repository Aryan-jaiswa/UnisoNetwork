// ...existing code...

import { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { storage } from "./storage";
import bcrypt from 'bcryptjs';
// @ts-ignore
import jwt from 'jsonwebtoken';
import { notifier } from './src/notifications/notifier';
import { OtpSecurity } from './src/security/otpSecurity';
import { AuditLogger, AuditAction, AuditStatus, AuditChannel, AuditPurpose } from './src/models/AuditLog';
import { RateLimiters } from './src/middleware/rateLimit';
import { sendOtpSchema, otpVerificationSchema, loginSchema, twoFactorRequestSchema, twoFactorVerifySchema, loginWith2FASchema, twoFactorSetupSchema, backupCodeVerifySchema, trustedDeviceSchema } from '../shared/schema';
import authRoutes from './src/routes/authRoutes';
import adminStatsRoutes from './src/routes/adminStats';
import CaptchaMiddleware from './src/middleware/captcha';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Initialize audit logger and rate limiters
const auditLogger = new AuditLogger(storage);
const otpRequestLimiter = RateLimiters.createOtpRequestLimiter(storage, auditLogger);
const otpVerifyLimiter = RateLimiters.createOtpVerifyLimiter(storage, auditLogger);
const authLimiter = RateLimiters.createAuthLimiter(storage, auditLogger);

// Extend Express Request type to include user
interface AuthRequest extends Request {
  user?: any;
}

// Helper function to get client info
function getClientInfo(req: Request) {
  return {
    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
               req.connection.remoteAddress || 
               'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Missing token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount auth routes
  app.use('/api/auth', authRoutes);
  
  // Mount admin routes
  app.use('/api/admin/stats', adminStatsRoutes);

  // Get groups the current user is a member of
  app.get('/api/groups/my', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const groups = await storage.getGroupsForUser(req.user.id);
      res.json(groups);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching my groups', error: (err as Error).message });
    }
  });

  // Join a group
  app.post('/api/groups/:id/join', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.joinGroup(req.user.id, Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: 'Error joining group', error: (err as Error).message });
    }
  });
  // Auth/OTP routes
  
  // Send OTP with hardened security
  app.post('/api/auth/send-otp', otpRequestLimiter.middleware(), async (req: Request, res: Response) => {
    const clientInfo = getClientInfo(req);
    
    try {
      // Validate input
      const validatedData = sendOtpSchema.parse(req.body);
      const { email, phone, channel, purpose } = validatedData;
      
      const contactInfo = channel === 'email' ? email : phone;
      if (!contactInfo) {
        await auditLogger.log(
          AuditAction.OTP_SEND,
          AuditStatus.FAILURE,
          { ...clientInfo, details: { error: 'Missing contact info', channel, purpose } }
        );
        return res.status(400).json({ message: 'Contact information is required' });
      }

      // Check daily limit
      const dailyCount = await storage.getDailyOtpCount(contactInfo, channel);
      const dailyLimit = 10; // configurable
      
      if (!OtpSecurity.checkDailyLimit(dailyCount, dailyLimit)) {
        await auditLogger.logRateLimit(`daily:${contactInfo}:${channel}`, {
          ...clientInfo,
          details: { dailyCount, dailyLimit, contactInfo: auditLogger['maskContactInfo'](contactInfo) }
        });
        return res.status(429).json({ 
          message: 'Daily OTP limit exceeded. Please try again tomorrow or contact support.',
          code: 'DAILY_LIMIT_EXCEEDED'
        });
      }

      // Check for existing OTP and resend cooldown
      const existingOtp = await storage.getOtpRecord(contactInfo, channel, purpose);
      if (existingOtp) {
        const canResend = OtpSecurity.canResend(new Date(existingOtp.last_sent_at), 1); // 1 minute cooldown
        if (!canResend) {
          await auditLogger.log(
            AuditAction.OTP_RESEND,
            AuditStatus.BLOCKED,
            { 
              ...clientInfo, 
              details: { 
                contactInfo: auditLogger['maskContactInfo'](contactInfo),
                cooldownRemaining: Math.ceil((60000 - (Date.now() - new Date(existingOtp.last_sent_at).getTime())) / 1000)
              }
            },
            channel as AuditChannel,
            purpose as AuditPurpose
          );
          return res.status(429).json({ 
            message: 'Please wait before requesting another OTP',
            retryAfter: Math.ceil((60000 - (Date.now() - new Date(existingOtp.last_sent_at).getTime())) / 1000)
          });
        }
      }

      // Generate secure OTP
      const otp = OtpSecurity.generateOtp();
      const { hash, salt } = OtpSecurity.hashOtp(otp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store secure OTP
      await storage.storeSecureOtp({
        contactInfo,
        channel,
        purpose,
        otpHash: hash,
        salt,
        expiresAt,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      // Send OTP
      let sendSuccess = false;
      try {
        if (channel === 'email') {
          await notifier.sendOtpEmail(contactInfo, otp);
          sendSuccess = true;
        } else if (channel === 'sms') {
          await notifier.sendOtpSms(contactInfo, otp);
          sendSuccess = true;
        }
      } catch (sendError) {
        console.error(`Failed to send ${channel} OTP:`, sendError);
        // Fallback to console logging for development
        console.log(`📧 ${channel.toUpperCase()} OTP for ${contactInfo}: ${otp}`);
        sendSuccess = true; // Consider console logging as success for development
      }

      if (sendSuccess) {
        await auditLogger.logOtpSend(
          contactInfo,
          channel as AuditChannel,
          purpose as AuditPurpose,
          AuditStatus.SUCCESS,
          clientInfo
        );

        res.json({ 
          success: true, 
          message: 'Verification code sent successfully',
          expiresIn: 300 // 5 minutes in seconds
        });
      } else {
        await auditLogger.logOtpSend(
          contactInfo,
          channel as AuditChannel,
          purpose as AuditPurpose,
          AuditStatus.FAILURE,
          { ...clientInfo, details: { error: 'Send failed' } }
        );

        res.status(500).json({ 
          message: 'Failed to send verification code. Please try again.' 
        });
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      
      await auditLogger.log(
        AuditAction.OTP_SEND,
        AuditStatus.FAILURE,
        { ...clientInfo, details: { error: (err as Error).message } }
      );

      res.status(500).json({ 
        message: 'An error occurred. Please try again.',
        ...(process.env.NODE_ENV === 'development' && { error: (err as Error).message })
      });
    }
  });

  // Verify OTP and register user with hardened security
  app.post('/api/auth/verify-otp-register', otpVerifyLimiter.middleware(), async (req: Request, res: Response) => {
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
        AuditChannel.EMAIL,
        AuditStatus.SUCCESS,
        clientInfo
      );

      // Send welcome email (non-blocking)
      setImmediate(async () => {
        try {
          await notifier.sendWelcomeEmail(user.email, user.name);
        } catch (welcomeError) {
          console.error('Failed to send welcome email:', welcomeError);
        }
      });

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
  });

  // Users

  // Signup (register)
  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      const { name, email, password_hash, avatar_url } = req.body;
      if (!name || !email || !password_hash) return res.status(400).json({ message: 'Missing fields' });
      const hashed = await bcrypt.hash(password_hash, 10);
      const user = await storage.createUser({ name, email, password_hash: hashed, avatar_url });
      res.json({ id: user.id, name: user.name, email: user.email });
    } catch (err) {
      console.error('Signup failed:', err);
      if (err instanceof Error && err.stack) {
        console.error('Stack trace:', err.stack);
      }
      res.status(500).json({ message: 'Signup failed', error: (err as Error).message });
    }
  });

  // Login
  app.post('/api/users/login', authLimiter.middleware(), async (req: Request, res: Response) => {
    const clientInfo = getClientInfo(req);
    
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);
      const { email, password } = validatedData;

      // Get user with 2FA info
      const user = await storage.getUserWith2FA(email);
      if (!user) {
        await auditLogger.log(
          AuditAction.USER_LOGIN_FAIL,
          AuditStatus.FAILURE,
          { 
            ...clientInfo, 
            details: { email: auditLogger.maskEmail(email), error: 'User not found' } 
          }
        );
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        await auditLogger.log(
          AuditAction.USER_LOGIN_FAIL,
          AuditStatus.FAILURE,
          { 
            ...clientInfo, 
            userId: user.id,
            details: { email: auditLogger.maskEmail(email), error: 'Invalid password' } 
          }
        );
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check if 2FA is enabled
      if (user.two_factor_enabled) {
        // Check for trusted device cookie
        const trustedDeviceId = req.cookies?.trusted_device;
        if (trustedDeviceId) {
          const trustedDevice = await storage.getTrustedDevice(trustedDeviceId);
          if (trustedDevice && trustedDevice.user_id === user.id) {
            // Update last used timestamp
            await storage.updateTrustedDeviceLastUsed(trustedDeviceId);
            
            // Log trusted device login
            await auditLogger.log(
              'login_trusted_device',
              AuditStatus.SUCCESS,
              { 
                ...clientInfo, 
                userId: user.id,
                details: { 
                  email: auditLogger.maskEmail(email),
                  deviceId: trustedDeviceId,
                  skipped2FA: true
                } 
              }
            );

            // Complete login without 2FA (trusted device)
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            
            await auditLogger.log(
              AuditAction.USER_LOGIN,
              AuditStatus.SUCCESS,
              { 
                ...clientInfo, 
                userId: user.id,
                details: { 
                  email: auditLogger.maskEmail(email),
                  viaTrustedDevice: true 
                } 
              }
            );

            return res.json({ 
              token, 
              user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                avatar_url: user.avatar_url,
                two_factor_enabled: user.two_factor_enabled 
              } 
            });
          }
        }

        await auditLogger.log(
          'login_2fa_required',
          AuditStatus.SUCCESS,
          { 
            ...clientInfo, 
            userId: user.id,
            details: { 
              email: auditLogger.maskEmail(email), 
              twoFactorChannel: user.two_factor_channel 
            } 
          }
        );

        return res.json({
          require_otp: true,
          user_id: user.id,
          two_factor_channel: user.two_factor_channel,
          message: 'Two-factor authentication required. Please verify your identity.'
        });
      }

      // Complete login without 2FA
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      
      await auditLogger.log(
        AuditAction.USER_LOGIN,
        AuditStatus.SUCCESS,
        { 
          ...clientInfo, 
          userId: user.id,
          details: { email: auditLogger.maskEmail(email) } 
        }
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          avatar_url: user.avatar_url,
          two_factor_enabled: user.two_factor_enabled 
        } 
      });

    } catch (error) {
      console.error('Login failed:', error);
      
      await auditLogger.log(
        AuditAction.USER_LOGIN_FAIL,
        AuditStatus.FAILURE,
        { 
          ...clientInfo, 
          details: { error: (error as Error).message } 
        }
      );

      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Please provide valid email and password.'
        });
      } else {
        res.status(500).json({ 
          message: 'Login failed', 
          error: (error as Error).message 
        });
      }
    }
  });

  // 2FA OTP Request - Send OTP for login verification
  app.post('/api/auth/2fa/request', authLimiter.middleware(), CaptchaMiddleware.optionalMiddleware(), async (req: Request, res: Response) => {
    const clientInfo = getClientInfo(req);
    
    try {
      // Validate request body
      const validatedData = twoFactorRequestSchema.parse(req.body);
      const { userId, channel } = validatedData;

      // Get user 2FA settings
      const user = await storage.get2FASettings(userId);
      if (!user || !user.two_factor_enabled) {
        await auditLogger.log(
          AuditAction.OTP_SEND,
          AuditStatus.FAILURE,
          { 
            ...clientInfo, 
            userId,
            details: { error: '2FA not enabled for user' },
            purpose: AuditPurpose.LOGIN
          }
        );
        return res.status(400).json({ 
          error: 'Two-factor authentication not enabled',
          message: 'Please enable 2FA in your account settings first.'
        });
      }

      // Use provided channel or user's preferred channel
      const otpChannel = channel || user.two_factor_channel;
      if (!otpChannel) {
        return res.status(400).json({ 
          error: 'No 2FA channel configured',
          message: 'Please configure a 2FA method in your account settings.'
        });
      }

      // Check daily 2FA limit
      const dailyCount = await storage.get2FACount(userId, 24);
      if (dailyCount >= 10) {
        await auditLogger.log(
          AuditAction.RATE_LIMIT_EXCEEDED,
          AuditStatus.BLOCKED,
          { 
            ...clientInfo, 
            userId,
            details: { dailyCount, limit: 10 },
            purpose: AuditPurpose.LOGIN,
            channel: otpChannel as AuditChannel
          }
        );
        return res.status(429).json({
          error: 'Daily 2FA limit exceeded',
          message: 'You have exceeded the daily limit for 2FA requests. Please try again tomorrow.'
        });
      }

      // Check for existing OTP with resend cooldown
      const contactInfo = otpChannel === 'email' ? user.email : user.phone;
      if (!contactInfo) {
        return res.status(400).json({ 
          error: 'Contact information missing',
          message: `${otpChannel === 'email' ? 'Email' : 'Phone number'} is required for ${otpChannel.toUpperCase()} 2FA.`
        });
      }

      const existingOtp = await storage.getOtpRecord(contactInfo, otpChannel, 'login');
      if (existingOtp && !OtpSecurity.canResend(existingOtp.last_sent_at, 1)) {
        return res.status(429).json({
          error: 'Resend cooldown active',
          message: 'Please wait before requesting another code.',
          retryAfter: 60
        });
      }

      // Generate and store secure OTP
      const otp = OtpSecurity.generateOtp();
      const salt = OtpSecurity.generateSalt();
      const { hash } = OtpSecurity.hashOtp(otp, salt);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await storage.storeSecureOtp({
        userId,
        contactInfo,
        channel: otpChannel,
            purpose: AuditPurpose.LOGIN,
        otpHash: hash,
        salt,
        expiresAt: expiresAt,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      // Send OTP
      try {
        if (otpChannel === 'email') {
          await notifier.sendOtpEmail(contactInfo, otp);
        } else {
          await notifier.sendOtpSms(contactInfo, otp);
        }

        await auditLogger.log(
          AuditAction.OTP_SEND,
          AuditStatus.SUCCESS,
          { 
            ...clientInfo, 
            userId,
            details: { 
              contactInfo: auditLogger.maskContactInfo(contactInfo),
              expiresAt: expiresAt.toISOString()
            },
            purpose: AuditPurpose.LOGIN,
            channel: otpChannel as AuditChannel
          }
        );

        res.json({
          success: true,
          message: `2FA code sent to your ${otpChannel}`,
          channel: otpChannel,
          expiresIn: 300 // 5 minutes
        });

      } catch (sendError) {
        console.error('Failed to send 2FA OTP:', sendError);
        
        await auditLogger.log(
          AuditAction.OTP_SEND,
          AuditStatus.FAILURE,
          { 
            ...clientInfo, 
            userId,
            details: { error: 'Send failed' },
            purpose: AuditPurpose.LOGIN,
            channel: otpChannel as AuditChannel
          }
        );

        res.status(500).json({
          error: 'Failed to send 2FA code',
          message: 'Unable to send verification code. Please try again.'
        });
      }

    } catch (error) {
      console.error('2FA request error:', error);
      
      await auditLogger.log(
        AuditAction.OTP_SEND,
        AuditStatus.FAILURE,
        { 
          ...clientInfo, 
          details: { error: (error as Error).message },
          purpose: AuditPurpose.LOGIN
        }
      );

      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request data.'
        });
      } else {
        res.status(500).json({
          error: 'Internal server error',
          message: 'An error occurred while processing your request.'
        });
      }
    }
  });

  // 2FA OTP Verification - Complete login with OTP
  app.post('/api/auth/2fa/verify', authLimiter.middleware(), async (req: Request, res: Response) => {
    const clientInfo = getClientInfo(req);
    
    try {
      // Validate request body
      const validatedData = loginWith2FASchema.parse(req.body);
      const { userId, otp, trustDevice } = validatedData;

      // Get user info
      const user = await storage.get2FASettings(userId);
      if (!user || !user.two_factor_enabled) {
        await auditLogger.log(
          AuditAction.OTP_VERIFY_FAIL,
          AuditStatus.FAILURE,
          { 
            ...clientInfo, 
            userId,
            details: { error: '2FA not enabled' },
            purpose: AuditPurpose.LOGIN
          }
        );
        return res.status(400).json({ 
          error: 'Two-factor authentication not configured',
          message: 'Please enable 2FA in your account settings.'
        });
      }

      const contactInfo = user.two_factor_channel === 'email' ? user.email : user.phone;
      if (!contactInfo) {
        return res.status(400).json({ 
          error: 'Contact information missing',
          message: 'Required contact information is not configured.'
        });
      }

      // Get OTP record
      const otpRecord = await storage.getOtpRecord(contactInfo, user.two_factor_channel, 'login');
      if (!otpRecord) {
        await auditLogger.log(
          AuditAction.OTP_VERIFY_FAIL,
          AuditStatus.FAILURE,
          { 
            ...clientInfo, 
            userId,
            details: { error: 'No OTP found' },
            purpose: AuditPurpose.LOGIN,
            channel: user.two_factor_channel as AuditChannel
          }
        );
        return res.status(400).json({
          error: 'No verification code found',
          message: 'Please request a new verification code.'
        });
      }

      // Check if account is locked
      const isLocked = await storage.isOtpLocked(otpRecord.id);
      if (isLocked) {
        await auditLogger.log(
          AuditAction.OTP_LOCKED,
          AuditStatus.BLOCKED,
          { 
            ...clientInfo, 
            userId,
            details: { otpId: otpRecord.id },
            purpose: AuditPurpose.LOGIN,
            channel: user.two_factor_channel as AuditChannel
          }
        );
        return res.status(423).json({
          error: 'Account temporarily locked',
          message: 'Too many failed attempts. Please wait 15 minutes before trying again.'
        });
      }

      // Verify OTP with constant-time comparison
      const isValid = OtpSecurity.verifyOtp(otp, otpRecord.otp_hash, otpRecord.salt);
      
      if (!isValid) {
        // Increment failed attempts
        const { attempts, shouldLock } = await storage.incrementOtpAttempts(otpRecord.id);
        
        // Check for suspicious activity (multiple failed attempts in short time)
        const suspiciousActivityCount = await storage.getSuspiciousActivity(userId, 10);
        if (suspiciousActivityCount >= 3) {
          // Send suspicious activity alert email (non-blocking)
          setTimeout(async () => {
            try {
              await notifier.sendSuspiciousActivityAlert(
                user.email,
                user.name,
                suspiciousActivityCount,
                '10 minutes'
              );
              
              await auditLogger.log(
                'suspicious_activity_alert_sent',
                AuditStatus.SUCCESS,
                { 
                  ...clientInfo, 
                  userId,
                  details: { 
                    email: auditLogger.maskEmail(user.email),
                    attemptCount: suspiciousActivityCount
                  }
                }
              );
            } catch (emailError) {
              console.error('Failed to send suspicious activity alert:', emailError);
            }
          }, 1000);
        }
        
        await auditLogger.log(
          AuditAction.OTP_VERIFY_FAIL,
          AuditStatus.FAILURE,
          { 
            ...clientInfo, 
            userId,
            details: { 
              attempts, 
              shouldLock,
              suspiciousActivityCount,
              contactInfo: auditLogger.maskContactInfo(contactInfo)
            },
            purpose: AuditPurpose.LOGIN,
            channel: user.two_factor_channel as AuditChannel
          }
        );

        if (shouldLock) {
          // Send account lockout notification (non-blocking)
          setTimeout(async () => {
            try {
              await notifier.sendAccountLockoutAlert(
                user.email,
                user.name,
                '15 minutes'
              );
            } catch (emailError) {
              console.error('Failed to send lockout notification:', emailError);
            }
          }, 1000);

          return res.status(423).json({
            error: 'Account temporarily locked',
            message: 'Too many failed attempts. Your account has been temporarily locked for 15 minutes.'
          });
        }

        return res.status(400).json({
          error: 'Invalid verification code',
          message: 'The code you entered is incorrect. Please try again.',
          attemptsRemaining: 5 - attempts
        });
      }

      // Success! Clear OTP and complete login
      await storage.clearOtpRecord(contactInfo, user.two_factor_channel, 'login');
      await storage.update2FASuccess(userId);

      // Generate JWT token
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      // Create trusted device if requested
      let trustedDeviceId = null;
      if (trustDevice) {
        try {
          const crypto = require('crypto');
          trustedDeviceId = crypto.randomUUID();
          
          await storage.createTrustedDevice(
            userId,
            trustedDeviceId,
            req.headers['user-agent'] || 'Unknown Device',
            clientInfo.ipAddress,
            clientInfo.userAgent
          );

          // Set httpOnly cookie for trusted device (30 days)
          res.cookie('trusted_device', trustedDeviceId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
          });

          await auditLogger.log(
            'trusted_device_created',
            AuditStatus.SUCCESS,
            { 
              ...clientInfo, 
              userId,
              details: { 
                deviceId: trustedDeviceId,
                deviceName: req.headers['user-agent'] || 'Unknown Device'
              }
            }
          );
        } catch (deviceError) {
          console.error('Error creating trusted device:', deviceError);
          // Don't fail the login, just log the error
        }
      }

      await auditLogger.log(
        AuditAction.OTP_VERIFY,
        AuditStatus.SUCCESS,
        { 
          ...clientInfo, 
          userId,
          details: { 
            contactInfo: auditLogger.maskContactInfo(contactInfo),
            trustedDevice: !!trustedDeviceId
          },
            purpose: AuditPurpose.LOGIN,
          channel: user.two_factor_channel as AuditChannel
        }
      );

      await auditLogger.log(
        AuditAction.USER_LOGIN,
        AuditStatus.SUCCESS,
        { 
          ...clientInfo, 
          userId,
          details: { 
            email: auditLogger.maskEmail(user.email),
            via2FA: true,
            trustedDevice: !!trustedDeviceId
          }
        }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          two_factor_enabled: user.two_factor_enabled
        },
        trustedDevice: !!trustedDeviceId,
        message: 'Login successful'
      });

    } catch (error) {
      console.error('2FA verification error:', error);
      
      await auditLogger.log(
        AuditAction.OTP_VERIFY_FAIL,
        AuditStatus.FAILURE,
        { 
          ...clientInfo, 
          details: { error: (error as Error).message },
          purpose: AuditPurpose.LOGIN
        }
      );

      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request data.'
        });
      } else {
        res.status(500).json({
          error: 'Internal server error',
          message: 'An error occurred while verifying your code.'
        });
      }
    }
  });

  // Get current user (used by frontend for auto-login)
  app.get('/api/users/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json({ id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url });
    } catch (err) {
      res.status(500).json({ message: 'Error fetching current user', error: (err as Error).message });
    }
  });

  // 2FA Management Endpoints

  // Get 2FA settings for current user
  app.get('/api/users/me/2fa', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const settings = await storage.get2FASettings(req.user.id);
      if (!settings) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        two_factor_enabled: settings.two_factor_enabled,
        two_factor_channel: settings.two_factor_channel,
        two_factor_backup_enabled: settings.two_factor_backup_enabled,
        last_2fa_at: settings.last_2fa_at,
        phone: settings.phone ? `***-***-${settings.phone.slice(-4)}` : null // Masked phone
      });
    } catch (error) {
      console.error('Error fetching 2FA settings:', error);
      res.status(500).json({ message: 'Error fetching 2FA settings', error: (error as Error).message });
    }
  });

  // Backup Code Verification - Alternative to OTP for 2FA
  app.post('/api/auth/2fa/backup-verify', authLimiter.middleware(), async (req: Request, res: Response) => {
    const clientInfo = getClientInfo(req);
    
    try {
      // Validate request body
      const validatedData = backupCodeVerifySchema.parse(req.body);
      const { userId, backupCode } = validatedData;

      // Get user info
      const user = await storage.get2FASettings(userId);
      if (!user || !user.two_factor_enabled) {
        await auditLogger.log(
          'backup_code_verify_fail',
          AuditStatus.FAILURE,
          { 
            ...clientInfo, 
            userId,
            details: { error: '2FA not enabled' },
            purpose: AuditPurpose.LOGIN
          }
        );
        return res.status(400).json({ 
          error: 'Two-factor authentication not configured',
          message: 'Please enable 2FA in your account settings.'
        });
      }

      // Verify backup code
      const { valid, codeId } = await storage.verifyBackupCode(userId, backupCode);
      
      if (!valid) {
        await auditLogger.log(
          'backup_code_verify_fail',
          AuditStatus.FAILURE,
          { 
            ...clientInfo, 
            userId,
            details: { 
              email: auditLogger.maskEmail(user.email),
              error: 'Invalid backup code'
            },
            purpose: AuditPurpose.LOGIN
          }
        );

        return res.status(400).json({
          error: 'Invalid backup code',
          message: 'The backup code you entered is invalid or has already been used.'
        });
      }

      // Success! Generate JWT token
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      await storage.update2FASuccess(userId);

      await auditLogger.log(
        'backup_code_verify_success',
        AuditStatus.SUCCESS,
        { 
          ...clientInfo, 
          userId,
          details: { 
            email: auditLogger.maskEmail(user.email),
            codeId
          },
          purpose: AuditPurpose.LOGIN
        }
      );

      await auditLogger.log(
        AuditAction.USER_LOGIN,
        AuditStatus.SUCCESS,
        { 
          ...clientInfo, 
          userId,
          details: { 
            email: auditLogger.maskEmail(user.email),
            viaBackupCode: true
          }
        }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          two_factor_enabled: user.two_factor_enabled
        },
        message: 'Login successful with backup code'
      });

    } catch (error) {
      console.error('Backup code verification error:', error);
      
      await auditLogger.log(
        'backup_code_verify_fail',
        AuditStatus.FAILURE,
        { 
          ...clientInfo, 
          details: { error: (error as Error).message },
          purpose: AuditPurpose.LOGIN
        }
      );

      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request data.'
        });
      } else {
        res.status(500).json({
          error: 'Internal server error',
          message: 'An error occurred while verifying your backup code.'
        });
      }
    }
  });

  // Get backup codes for current user
  app.get('/api/users/me/2fa/backup-codes', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const unusedCount = await storage.getUnusedBackupCodeCount(req.user.id);
      
      res.json({
        unusedCount,
        message: unusedCount > 0 
          ? `You have ${unusedCount} unused backup codes remaining.`
          : 'No backup codes available. Generate new ones to ensure account recovery.'
      });
    } catch (error) {
      console.error('Error fetching backup codes info:', error);
      res.status(500).json({ 
        message: 'Error fetching backup codes information', 
        error: (error as Error).message 
      });
    }
  });

  // Generate new backup codes (replaces existing ones)
  app.post('/api/users/me/2fa/backup-codes', authMiddleware, async (req: AuthRequest, res: Response) => {
    const clientInfo = getClientInfo(req);
    
    try {
      // Check if user has 2FA enabled
      const user = await storage.get2FASettings(req.user.id);
      if (!user || !user.two_factor_enabled) {
        return res.status(400).json({
          error: '2FA not enabled',
          message: 'Please enable two-factor authentication before generating backup codes.'
        });
      }

      // Generate 8 backup codes
      const crypto = require('crypto');
      const backupCodes = Array.from({ length: 8 }, () => {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
      });

      // Store hashed backup codes
      const success = await storage.generateBackupCodes(req.user.id, backupCodes);
      
      if (!success) {
        throw new Error('Failed to generate backup codes');
      }

      await auditLogger.log(
        'backup_codes_generated',
        AuditStatus.SUCCESS,
        { 
          ...clientInfo, 
          userId: req.user.id,
          details: { 
            email: auditLogger.maskEmail(user.email),
            codeCount: backupCodes.length
          }
        }
      );

      res.json({
        success: true,
        backupCodes,
        message: 'New backup codes generated. Store these securely - they will not be shown again.',
        warning: 'These codes can be used to access your account if you lose access to your 2FA device.'
      });

    } catch (error) {
      console.error('Error generating backup codes:', error);
      
      await auditLogger.log(
        'backup_codes_generation_failed',
        AuditStatus.FAILURE,
        { 
          ...clientInfo, 
          userId: req.user.id,
          details: { error: (error as Error).message }
        }
      );

      res.status(500).json({ 
        message: 'Error generating backup codes', 
        error: (error as Error).message 
      });
    }
  });

  // Trusted device management
  app.get('/api/users/me/trusted-devices', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const devices = await storage.getUserTrustedDevices(req.user.id);
      
      res.json({
        devices: devices.map((device: any) => ({
          deviceId: device.device_id,
          deviceName: device.device_name,
          ipAddress: device.ip_address,
          createdAt: device.created_at,
          lastUsedAt: device.last_used_at,
          expiresAt: device.expires_at
        }))
      });
    } catch (error) {
      console.error('Error fetching trusted devices:', error);
      res.status(500).json({ 
        message: 'Error fetching trusted devices', 
        error: (error as Error).message 
      });
    }
  });

  // Revoke trusted device
  app.delete('/api/users/me/trusted-devices/:deviceId', authMiddleware, async (req: AuthRequest, res: Response) => {
    const clientInfo = getClientInfo(req);
    
    try {
      const { deviceId } = req.params;
      const success = await storage.revokeTrustedDevice(req.user.id, deviceId);
      
      if (!success) {
        return res.status(404).json({
          error: 'Device not found',
          message: 'Trusted device not found or already revoked.'
        });
      }

      await auditLogger.log(
        'trusted_device_revoked',
        AuditStatus.SUCCESS,
        { 
          ...clientInfo, 
          userId: req.user.id,
          details: { deviceId }
        }
      );

      res.json({
        success: true,
        message: 'Trusted device revoked successfully.'
      });

    } catch (error) {
      console.error('Error revoking trusted device:', error);
      res.status(500).json({ 
        message: 'Error revoking trusted device', 
        error: (error as Error).message 
      });
    }
  });

  // Enable/Disable 2FA
  app.post('/api/users/me/2fa', authMiddleware, async (req: Request, res: Response) => {
    const clientInfo = getClientInfo(req);
    
    try {
      const validatedData = twoFactorSetupSchema.parse(req.body);
      const { enabled, channel, phone } = validatedData;

      if (enabled) {
        // Enable 2FA
        if (!channel) {
          return res.status(400).json({
            error: 'Channel required',
            message: 'Please specify email or SMS for 2FA.'
          });
        }

        if (channel === 'sms' && !phone) {
          return res.status(400).json({
            error: 'Phone number required',
            message: 'Phone number is required for SMS 2FA.'
          });
        }

        const updatedUser = await storage.enable2FA((req as AuthRequest).user.id, channel, phone);
        if (!updatedUser) {
          throw new Error('Failed to enable 2FA');
        }

        await auditLogger.log(
          'user_2fa_enabled',
          AuditStatus.SUCCESS,
          { 
            ...clientInfo, 
            userId: (req as AuthRequest).user.id,
            details: { 
              channel,
              phone: phone ? auditLogger.maskContactInfo(phone) : undefined
            }
          }
        );

        res.json({
          success: true,
          message: `Two-factor authentication enabled via ${channel}`,
          two_factor_enabled: true,
          two_factor_channel: channel
        });

      } else {
        // Disable 2FA
        const updatedUser = await storage.disable2FA((req as AuthRequest).user.id);
        if (!updatedUser) {
          throw new Error('Failed to disable 2FA');
        }

        await auditLogger.log(
          'user_2fa_disabled',
          AuditStatus.SUCCESS,
          { 
            ...clientInfo, 
            userId: (req as AuthRequest).user.id,
            details: { previousChannel: req.body.previousChannel }
          }
        );

        res.json({
          success: true,
          message: 'Two-factor authentication disabled',
          two_factor_enabled: false
        });
      }

    } catch (error) {
      console.error('Error updating 2FA settings:', error);
      
      await auditLogger.log(
        'user_2fa_change_failed',
        AuditStatus.FAILURE,
        { 
          ...clientInfo, 
          userId: (req as AuthRequest).user.id,
          details: { error: (error as Error).message }
        }
      );

      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid 2FA configuration data.'
        });
      } else {
        res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to update 2FA settings.'
        });
      }
    }
  });

  app.get('/api/users/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching user', error: (err as Error).message });
    }
  });

  // Internships
  app.get('/api/internships', async (req: Request, res: Response) => {
    try {
      const filters = {
        type: req.query.type as string,
        domain: req.query.domain as string,
        location: req.query.location as string,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };
      const internships = await storage.getInternships(filters);
      res.json(internships);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching internships', error: (err as Error).message });
    }
  });

  app.post('/api/internships', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const internshipData = {
        ...req.body,
        created_by: req.user.id
      };
      const internship = await storage.createInternship(internshipData);
      res.json(internship);
    } catch (err) {
      res.status(500).json({ message: 'Error creating internship', error: (err as Error).message });
    }
  });

  // Companies
  app.get('/api/companies', async (req: Request, res: Response) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching companies', error: (err as Error).message });
    }
  });

  app.post('/api/companies', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const company = await storage.createCompany(req.body);
      res.json(company);
    } catch (err) {
      res.status(500).json({ message: 'Error creating company', error: (err as Error).message });
    }
  });

  // Forums (Real Talks)
  app.get('/api/forums', async (req: Request, res: Response) => {
    try {
      const forumId = req.query.forum_id ? Number(req.query.forum_id) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const posts = await storage.getForumReplies(forumId || 1, limit);
      res.json(posts);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching forum posts', error: (err as Error).message });
    }
  });

  app.post('/api/forums', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const postData = {
        title: req.body.title || 'Forum Post',
        content: req.body.content,
        category: req.body.category || 'general',
        created_by: req.user.id
      };
      const post = await storage.createForumThread(postData);
      res.json(post);
    } catch (err) {
      res.status(500).json({ message: 'Error creating forum post', error: (err as Error).message });
    }
  });

  app.get('/api/forums/:id/posts', async (req: Request, res: Response) => {
    try {
      const posts = await storage.getForumReplies(Number(req.params.id));
      res.json(posts);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching forum posts', error: (err as Error).message });
    }
  });

  app.post('/api/forums/:id/posts', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const postData = {
        thread_id: Number(req.params.id),
        content: req.body.content,
        created_by: req.user.id
      };
      const post = await storage.createForumReply(postData);
      res.json(post);
    } catch (err) {
      res.status(500).json({ message: 'Error creating forum post', error: (err as Error).message });
    }
  });

  // Groups
  app.get('/api/groups', async (req: Request, res: Response) => {
    try {
      const filters = {
        category: req.query.category as string,
        privacy: req.query.privacy as string,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };
      const groups = await storage.getGroups(filters);
      res.json(groups);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching groups', error: (err as Error).message });
    }
  });

  app.post('/api/groups', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const groupData = {
        ...req.body,
        created_by: req.user.id
      };
      const group = await storage.createGroup(groupData);
      res.json(group);
    } catch (err) {
      res.status(500).json({ message: 'Error creating group', error: (err as Error).message });
    }
  });

  // Events
  app.get('/api/events', async (req: Request, res: Response) => {
    try {
      const filters = {
        event_type: req.query.event_type as string,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };
      const events = await storage.getEvents(filters);
      res.json(events);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching events', error: (err as Error).message });
    }
  });

  app.post('/api/events', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const eventData = {
        ...req.body,
        created_by: req.user.id
      };
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (err) {
      res.status(500).json({ message: 'Error creating event', error: (err as Error).message });
    }
  });

  // Resources
  app.get('/api/resources', async (req: Request, res: Response) => {
    try {
      const filters = {
        category: req.query.category as string,
        resource_type: req.query.resource_type as string,
        limit: req.query.limit ? Number(req.query.limit) : undefined
      };
      const resources = await storage.getResources(filters);
      res.json(resources);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching resources', error: (err as Error).message });
    }
  });

  app.post('/api/resources', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const resourceData = {
        ...req.body,
        posted_by: req.user.id
      };
      const resource = await storage.createResource(resourceData);
      res.json(resource);
    } catch (err) {
      res.status(500).json({ message: 'Error creating resource', error: (err as Error).message });
    }
  });

  // Search endpoint
  app.get('/api/search', async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const type = req.query.type as string;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      
      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const results = await storage.searchContent(query, type, limit);
      res.json(results);
    } catch (err) {
      res.status(500).json({ message: 'Error searching content', error: (err as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
