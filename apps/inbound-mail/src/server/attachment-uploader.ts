import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import pino from 'pino';

const logger = pino();

const LOG_CONTEXT = 'AttachmentUploader';

const MAX_PRESIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days — S3 maximum for presigned URLs

export interface UploadedAttachment {
  filename: string;
  contentType: string;
  size: number;
  url: string;
  storagePath: string;
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

async function uploadSingle(
  s3: S3Client,
  bucket: string,
  messageId: string,
  index: number,
  attachment: { filename?: string; contentType?: string; content?: Buffer | SerializedBuffer | string }
): Promise<UploadedAttachment | null> {
  const filename = attachment.filename || 'attachment';
  const contentType = attachment.contentType || 'application/octet-stream';

  if (!attachment.content) {
    logger.warn({ context: LOG_CONTEXT, filename }, 'Attachment has no content, skipping upload');

    return null;
  }

  let content: Buffer;

  if (Buffer.isBuffer(attachment.content)) {
    content = attachment.content;
  } else if (isSerializedBuffer(attachment.content)) {
    content = Buffer.from(attachment.content.data);
  } else if (typeof attachment.content === 'string') {
    content = Buffer.from(attachment.content);
  } else {
    logger.warn({ context: LOG_CONTEXT, filename }, 'Attachment content has unsupported shape, skipping upload');

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

export async function uploadAttachmentsToS3(
  messageId: string,
  attachments: Array<Record<string, unknown>>
): Promise<{ uploaded: UploadedAttachment[]; failedCount: number }> {
  if (!attachments || attachments.length === 0) {
    return { uploaded: [], failedCount: 0 };
  }

  const bucket = process.env.S3_BUCKET_NAME;

  if (!bucket) {
    logger.warn({ context: LOG_CONTEXT }, 'S3_BUCKET_NAME is not set — attachments will be dropped');

    return { uploaded: [], failedCount: 0 };
  }

  const s3 = buildS3Client();
  let failedCount = 0;

  const results = await Promise.all(
    attachments.map(async (attachment, index) => {
      try {
        return await uploadSingle(
          s3,
          bucket,
          messageId,
          index,
          attachment as { filename?: string; contentType?: string; content?: Buffer | SerializedBuffer | string }
        );
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

  return { uploaded, failedCount };
}
