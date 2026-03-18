export type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

export type SmsPayload = {
  to: string;
  body: string;
};

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>;
}

export interface SmsProvider {
  send(payload: SmsPayload): Promise<void>;
}
