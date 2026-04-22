import type { Adapter, FetchResult, RawMessage, FormattedContent, ChatInstance, WebhookOptions } from 'chat';

export interface NovuEmailAdapterConfig {
  fromAddress: string;
  fromName?: string;
  signingSecret: string;
  sendEmail: (params: SendEmailParams) => Promise<{ messageId: string }>;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
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

export interface NovuEmailAttachment {
  filename: string;
  contentType: string;
  url?: string;
}

export interface EmailWebhookPayload {
  messageId: string;
  inReplyTo?: string;
  references?: string;
  from: { address: string; name?: string };
  to: { address: string; name?: string }[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: NovuEmailAttachment[];
  date: string;
}

export type NovuEmailAdapter = Adapter<NovuEmailThreadId, NovuEmailRawMessage>;
