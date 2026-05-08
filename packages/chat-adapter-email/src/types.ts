import type { IEmailAlternative } from '@novu/shared';
import type { Adapter } from 'chat';

export type { EmailWebhookPayload, NovuEmailAttachment } from '@novu/shared';

export interface NovuEmailAdapterConfig {
  senderName?: string;
  signingSecret: string;
  sendEmail: (params: SendEmailParams) => Promise<{ messageId?: string }>;
}

export type EmailAlternative = IEmailAlternative;

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  alternatives?: EmailAlternative[];
  inReplyTo?: string;
  references?: string;
  messageId?: string;
}

export interface NovuEmailThreadId {
  recipientAddress: string;
  rootMessageIdHash: string;
}

export interface NovuEmailRawMessage {
  id: string;
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  createdAt: string;
  attachments?: import('@novu/shared').NovuEmailAttachment[];
}

export type NovuEmailAdapter = Adapter<NovuEmailThreadId, NovuEmailRawMessage>;
