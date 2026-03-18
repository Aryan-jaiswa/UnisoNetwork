import sgMail from '@sendgrid/mail';
import { EmailProvider, EmailPayload } from '../types';

export class SendGridProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    }
  }

  async send(payload: EmailPayload): Promise<void> {
    if (!this.apiKey) {
      console.warn('⚠️  SendGrid API key not configured, skipping email send:', {
        to: payload.to,
        subject: payload.subject
      });
      return;
    }

    if (!this.fromEmail) {
      throw new Error('FROM_EMAIL environment variable is required for SendGrid');
    }

    try {
      const msg = {
        to: payload.to,
        from: this.fromEmail,
        subject: payload.subject,
        content: [
          {
            type: 'text/plain',
            value: payload.text || ''
          },
          ...(payload.html ? [{
            type: 'text/html',
            value: payload.html
          }] : [])
        ]
      } as any;

      const result = await sgMail.send(msg);
      
      console.log(`✅ Email sent successfully to ${payload.to}`, {
        messageId: result[0]?.headers?.['x-message-id'],
        statusCode: result[0]?.statusCode
      });
    } catch (error: any) {
      // Enhanced error handling for SendGrid
      let errorMessage = 'Failed to send email via SendGrid';
      
      if (error.response?.body?.errors) {
        const sgErrors = error.response.body.errors;
        errorMessage = `SendGrid Error: ${sgErrors.map((e: any) => e.message).join(', ')}`;
      } else if (error.message) {
        errorMessage = `SendGrid Error: ${error.message}`;
      }

      console.error('❌ SendGrid email send failed:', {
        error: errorMessage,
        to: payload.to,
        subject: payload.subject,
        statusCode: error.code || error.response?.status,
        response: error.response?.body
      });

      throw new Error(errorMessage);
    }
  }
}
