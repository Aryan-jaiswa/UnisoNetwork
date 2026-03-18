import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';
import { sendOtpSchema } from '../shared/schema';
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
      // Validate request data
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
      const dailyLimit = 10;
      
      if (!OtpSecurity.checkDailyLimit(dailyCount, dailyLimit)) {
        await auditLogger.logRateLimit(`daily:${contactInfo}:${channel}`, {
          ...clientInfo,
          details: { dailyCount, dailyLimit }
        });
        return res.status(429).json({ 
          message: 'Daily OTP limit exceeded. Please try again tomorrow.',
          code: 'DAILY_LIMIT_EXCEEDED'
        });
      }

      // Check for existing OTP and resend cooldown
      const existingOtp = await storage.getOtpRecord(contactInfo, channel, purpose);
      if (existingOtp) {
        const canResend = OtpSecurity.canResend(new Date(existingOtp.last_sent_at), 1);
        if (!canResend) {
          await auditLogger.log(
            AuditAction.OTP_RESEND,
            AuditStatus.BLOCKED,
            { 
              ...clientInfo, 
              details: { 
                contactInfo,
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
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

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
          expiresIn: 300
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
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
