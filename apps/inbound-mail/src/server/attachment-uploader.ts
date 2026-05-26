import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import pino from 'pino';

const logger = pino();

const LOG_CONTEXT = 'AttachmentUploader';

const MAX_PRESIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days — S3 maximum for presigned URLs

/*
 * Per-attachment cap when running in inline (S3-not-configured) fallback mode.
 * Mirrors the pre-S3 `MAX_ATTACHMENT_BYTES` cap so a single bad attachment cannot
 * blow up Redis / BullMQ memory on a self-hosted deployment. Keeping it constant
 * here (instead of an env var) keeps the contract obvious — operators that need
 * larger attachments should configure S3 storage instead.
 */
const INLINE_PER_ATTACHMENT_CAP_BYTES = 5 * 1024 * 1024;

/**
 * S3-mode attachment shape returned to the SMTP server: only slim metadata is
 * carried in the queue payload; consumers download the file via the presigned URL.
 */
export interface UploadedAttachment {
  filename: string;
  contentType: string;
  size: number;
  url: string;
  storagePath: string;
}

/**
 * Inline-mode attachment shape returned when S3 is not configured. The binary
 * content travels inside the BullMQ payload (pre-PR #11053 behavior) so legacy
 * webhook / reply-to / agent flows keep working on self-hosted deployments.
 */
export interface InlineAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: { type: 'Buffer'; data: number[] };
}

export type ProcessedAttachment = UploadedAttachment | InlineAttachment;

export type AttachmentProcessingMode = 's3' | 'inline';

export interface AttachmentProcessingResult {
  mode: AttachmentProcessingMode;
  uploaded: ProcessedAttachment[];
  failedCount: number;
}

interface SerializedBuffer {
  type: 'Buffer';
  data: number[];
}

function buildS3Client(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_LOCAL_STACK || undefined,
    forcePathStyle: true,
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

/*
 * SMTP MTAs retry delivery with the same Message-ID, so the storage key MUST
 * be a deterministic function of (messageId, attachment index, filename).
 * Using a random UUID or wall-clock date would create duplicate S3 objects on
 * retry instead of idempotently overwriting via PutObject.
 */
function buildStorageKey(messageId: string, filename: string, index: number): string {
  const safeFilename = sanitizeFilename(filename || 'attachment');
  const safeMessageId = sanitizeFilename(messageId);

  return `inbound-mail/${safeMessageId}/${index}-${safeFilename}`;
}

function getTtlSeconds(): number {
  const configured = parseInt(process.env.INBOUND_ATTACHMENT_URL_TTL_SECONDS || '', 10);

  if (!Number.isNaN(configured) && configured > 0) {
    return Math.min(configured, MAX_PRESIGNED_URL_TTL_SECONDS);
  }

  return MAX_PRESIGNED_URL_TTL_SECONDS;
}

function isSerializedBuffer(value: unknown): value is SerializedBuffer {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { type?: unknown; data?: unknown };

  return candidate.type === 'Buffer' && Array.isArray(candidate.data);
}

type AttachmentInput = { filename?: string; contentType?: string; content?: Buffer | SerializedBuffer | string };

/*
 * Decode mailparser's three possible content shapes into a Buffer. Returns
 * null when content is missing or has an unsupported shape so callers can
 * skip the attachment without throwing.
 */
function coerceAttachmentContent(content: AttachmentInput['content']): Buffer | null {
  if (!content) {
    return null;
  }

  if (Buffer.isBuffer(content)) {
    return content;
  }

  if (isSerializedBuffer(content)) {
    return Buffer.from(content.data);
  }

  if (typeof content === 'string') {
    return Buffer.from(content);
  }

  return null;
}

async function uploadSingle(
  s3: S3Client,
  bucket: string,
  messageId: string,
  index: number,
  attachment: AttachmentInput
): Promise<UploadedAttachment | null> {
  const filename = attachment.filename || 'attachment';
  const contentType = attachment.contentType || 'application/octet-stream';

  const content = coerceAttachmentContent(attachment.content);

  if (!content) {
    logger.warn(
      { context: LOG_CONTEXT, filename },
      'Attachment has no content or has unsupported shape, skipping upload'
    );

    return null;
  }

  const storagePath = buildStorageKey(messageId, filename, index);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storagePath,
      Body: content,
      ContentType: contentType,
    })
  );

  const ttlSeconds = getTtlSeconds();
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: storagePath }), {
    expiresIn: ttlSeconds,
  });

  return {
    filename,
    contentType,
    size: content.byteLength,
    url,
    storagePath,
  };
}

/*
 * Inline (S3-not-configured) fallback: keep the binary in the BullMQ payload as
 * a serialized Buffer so the worker can pass it straight through to legacy
 * webhook / reply-to / agent flows. Per-attachment size is hard-capped to
 * protect Redis from oversized blobs — operators that need larger files must
 * configure S3 storage instead.
 */
function processInline(attachment: AttachmentInput): InlineAttachment | null {
  const filename = attachment.filename || 'attachment';
  const contentType = attachment.contentType || 'application/octet-stream';

  const content = coerceAttachmentContent(attachment.content);

  if (!content) {
    logger.warn(
      { context: LOG_CONTEXT, filename },
      'Attachment has no content or has unsupported shape, skipping inline embed'
    );

    return null;
  }

  if (content.byteLength > INLINE_PER_ATTACHMENT_CAP_BYTES) {
    logger.warn(
      { context: LOG_CONTEXT, filename, size: content.byteLength, cap: INLINE_PER_ATTACHMENT_CAP_BYTES },
      'Attachment exceeds inline fallback per-attachment cap; dropping (configure S3 to support larger files)'
    );

    return null;
  }

  return {
    filename,
    contentType,
    size: content.byteLength,
    content: { type: 'Buffer', data: Array.from(content) },
  };
}

/**
 * Process inbound email attachments before they enter the BullMQ queue.
 *
 * When `S3_BUCKET_NAME` is set, attachments are uploaded to S3 and the queue
 * payload only carries slim metadata + a presigned URL. When it is unset
 * (typical self-hosted deployment), attachments are kept inline in the queue
 * payload — restoring pre-PR #11053 behavior and ensuring legacy webhook /
 * reply-to / agent flows keep working without S3.
 *
 * The `mode` field on the result lets the SMTP layer adjust its retry policy:
 * `INBOUND_FAIL_ON_ATTACHMENT_UPLOAD_ERROR` only makes sense in `s3` mode.
 */
export async function uploadAttachmentsToS3(
  messageId: string,
  attachments: Array<Record<string, unknown>>
): Promise<AttachmentProcessingResult> {
  if (!attachments || attachments.length === 0) {
    return { mode: 's3', uploaded: [], failedCount: 0 };
  }

  const bucket = process.env.S3_BUCKET_NAME;

  if (!bucket) {
    logger.info(
      { context: LOG_CONTEXT, messageId, count: attachments.length },
      'S3_BUCKET_NAME not set — embedding attachment content inline in queue payload (legacy fallback)'
    );

    let failedCount = 0;
    const uploaded: ProcessedAttachment[] = [];

    for (const attachment of attachments) {
      const result = processInline(attachment as AttachmentInput);

      if (result) {
        uploaded.push(result);
      } else {
        failedCount += 1;
      }
    }

    return { mode: 'inline', uploaded, failedCount };
  }

  const s3 = buildS3Client();
  let failedCount = 0;

  const results = await Promise.all(
    attachments.map(async (attachment, index) => {
      try {
        return await uploadSingle(s3, bucket, messageId, index, attachment as AttachmentInput);
      } catch (err) {
        failedCount += 1;
        logger.error(
          { err, context: LOG_CONTEXT, messageId, filename: attachment.filename },
          'Failed to upload attachment to S3'
        );

        return null;
      }
    })
  );

  const uploaded = results.filter((r): r is UploadedAttachment => r !== null);

  return { mode: 's3', uploaded, failedCount };
}
