import twilio from 'twilio';
import { SmsProvider, SmsPayload } from '../types';

export class TwilioProvider implements SmsProvider {
  private client: twilio.Twilio | null = null;
  private fromNumber: string;
  private accountSid: string;
  private authToken: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    }
  }

  async send(payload: SmsPayload): Promise<void> {
    if (!this.client) {
      console.warn('⚠️  Twilio credentials not configured, skipping SMS send:', {
        to: payload.to,
        body: payload.body.substring(0, 50) + '...'
      });
      return;
    }

    if (!this.fromNumber) {
      throw new Error('TWILIO_FROM_NUMBER environment variable is required for Twilio');
    }

    try {
      const message = await this.client.messages.create({
        body: payload.body,
        from: this.fromNumber,
        to: payload.to
      });

      console.log(`✅ SMS sent successfully to ${payload.to}`, {
        messageId: message.sid,
        status: message.status,
        direction: message.direction
      });
    } catch (error: any) {
      // Enhanced error handling for Twilio
      let errorMessage = 'Failed to send SMS via Twilio';
      
      if (error.code) {
        // Twilio error codes provide specific information
        errorMessage = `Twilio Error ${error.code}: ${error.message}`;
      } else if (error.message) {
        errorMessage = `Twilio Error: ${error.message}`;
      }

      console.error('❌ Twilio SMS send failed:', {
        error: errorMessage,
        to: payload.to,
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo
      });

      throw new Error(errorMessage);
    }
  }

  // Utility method to validate phone number format
  static isValidPhoneNumber(phone: string): boolean {
    // Basic E.164 format validation (starts with + followed by digits)
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  // Utility method to format phone number to E.164
  static formatToE164(phone: string, defaultCountryCode: string = '+1'): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If already starts with country code, add +
    if (digits.length > 10) {
      return '+' + digits;
    }
    
    // If 10 digits, assume US number
    if (digits.length === 10) {
      return defaultCountryCode + digits;
    }
    
    // Return as-is if can't determine format
    return phone;
  }
}
