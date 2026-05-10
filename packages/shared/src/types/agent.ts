export interface NovuEmailAttachment {
  filename: string;
  contentType: string;
  /** File size in bytes. */
  size?: number;
  /** Presigned GET URL to download the attachment. */
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
