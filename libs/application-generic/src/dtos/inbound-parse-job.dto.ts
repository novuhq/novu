import { IBulkJobParams, IJobParams } from '../services/queues/queue-base.service';

/**
 * Attachment metadata stored in the BullMQ queue payload. Two shapes coexist
 * depending on whether the inbound-mail server has S3 configured:
 *
 * - **S3 mode** (Novu Cloud / self-hosted with `S3_BUCKET_NAME`): the binary is
 *   uploaded to S3 and only slim metadata + a presigned `url` + the internal
 *   `storagePath` travel through Redis. The worker rehydrates `content` from
 *   S3 for legacy webhook consumers via `AttachmentRehydrator`.
 *
 * - **Inline mode** (self-hosted without `S3_BUCKET_NAME` — pre-PR #11053
 *   fallback): the binary travels inside the queue payload as `content` (the
 *   mailparser legacy `{ type: 'Buffer', data: number[] }` shape). `url` and
 *   `storagePath` are absent and the rehydrator passes `content` through
 *   unchanged. Capped at 5 MB per attachment by the inbound-mail server.
 */
export interface IInboundParseAttachment {
  filename: string;
  contentType: string;
  size: number;
  /**
   * Presigned GET URL valid for INBOUND_ATTACHMENT_URL_TTL_SECONDS (default 7 days).
   * Absent in inline-mode payloads (S3 not configured).
   */
  url?: string;
  /**
   * Internal S3 key — used by the worker to rehydrate content for legacy webhooks.
   * Absent in inline-mode payloads (S3 not configured).
   */
  storagePath?: string;
  /**
   * Inline binary content — present only when the inbound-mail server is
   * running without S3 configured. Mutually exclusive with `url`/`storagePath`
   * in normal operation.
   */
  content?: { type: 'Buffer'; data: number[] };
}

export interface IInboundParseDataDto {
  html: string;
  text: string;
  headers: IHeaders;
  subject: string;
  messageId: string;
  inReplyTo?: string;
  references?: string | string[];
  priority: string;
  from: IFrom[];
  to: ITo[];
  date: Date;
  dkim: string;
  spf: string;
  spamScore: number;
  language: string;
  cc: any[];
  attachments?: IInboundParseAttachment[];
  connection: IConnection;
  envelopeFrom: IEnvelopeFrom;
  envelopeTo: IEnvelopeTo[];
  /**
   * Identifier of the early ClickHouse `requests` row written by the
   * inbound-mail server before this job was enqueued. The worker links its
   * terminal completion trace (`request_delivered` / `request_failed`) to
   * this id so the request detail view shows the full lifecycle.
   *
   * Optional for backward compatibility with jobs queued before early logging
   * was deployed; missing id means the worker should fall back to writing the
   * full row itself (legacy path).
   */
  requestLogId?: string;
}

export interface IHeaders {
  'content-type': string;
  from: string;
  to: string;
  subject: string;
  'message-id': string;
  'in-reply-to'?: string;
  references?: string;
  date: string;
  'mime-version': string;
}

export interface IFrom {
  address: string;
  name: string;
}

export interface ITo {
  address: string;
  name: string;
}

export interface ITlsOptions {
  name: string;
  standardName: string;
  version: string;
}

export interface IMailFrom {
  address: string;
  args: boolean;
}

export interface IRcptTo {
  address: string;
  args: boolean;
}

export interface IEnvelope {
  mailFrom: IMailFrom;
  rcptTo: IRcptTo[];
}

export interface IConnection {
  id: string;
  remoteAddress: string;
  remotePort: number;
  clientHostname: string;
  openingCommand: string;
  hostNameAppearsAs: string;
  xClient: any;
  xForward: any;
  transmissionType: string;
  tlsOptions: ITlsOptions;
  envelope: IEnvelope;
  transaction: number;
  mailPath: string;
}

export interface IEnvelopeFrom {
  address: string;
  args: boolean;
}

export interface IEnvelopeTo {
  address: string;
  args: boolean;
}

export interface IInboundParseJobDto extends IJobParams {
  data?: IInboundParseDataDto;
}

export interface IInboundParseBulkJobDto extends IBulkJobParams {
  data: IInboundParseDataDto;
}
