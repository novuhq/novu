export interface NovuEmailAttachment {
  filename: string;
  contentType: string;
  /** File size in bytes. */
  size?: number;
  /**
   * Base64-encoded file bytes. Present when the inbound mail server has the
   * file content available inline. Mutually exclusive with `url` — when both
   * are provided, `contentBase64` takes precedence during hydration.
   */
  contentBase64?: string;
  /**
   * Set to true when the attachment was over the per-attachment or aggregate
   * size cap and its bytes were not included in the payload.
   */
  truncated?: boolean;
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
