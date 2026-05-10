import type { IEmailAlternative, NovuEmailAttachment } from '@novu/shared';
import type { Adapter } from 'chat';

export type { EmailWebhookPayload, NovuEmailAttachment } from '@novu/shared';

export interface NovuEmailAdapterConfig {
  senderName?: string;
  signingSecret: string;
  sendEmail: (params: SendEmailParams) => Promise<{ messageId?: string }>;
}

export type EmailAlternative = IEmailAlternative;

export interface SendEmailAttachment {
  /** Original filename of the attachment. */
  filename: string;
  /** MIME content type (e.g. "application/pdf"). */
  contentType?: string;
  /** Binary content of the attachment. */
  data: Buffer;
  /** Content-ID for inline (embedded) attachments. */
  cid?: string;
  disposition?: 'attachment' | 'inline';
}

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  alternatives?: EmailAlternative[];
  attachments?: SendEmailAttachment[];
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
  attachments?: NovuEmailAttachment[];
}

export type NovuEmailAdapter = Adapter<NovuEmailThreadId, NovuEmailRawMessage>;
