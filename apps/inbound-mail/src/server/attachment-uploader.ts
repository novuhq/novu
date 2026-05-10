import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
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

function buildStorageKey(messageId: string, filename: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const uuid = randomUUID();
  const safe = sanitizeFilename(filename || 'attachment');

  return `inbound-mail/${date}/${sanitizeFilename(messageId)}/${uuid}-${safe}`;
}

function getTtlSeconds(): number {
  const configured = parseInt(process.env.INBOUND_ATTACHMENT_URL_TTL_SECONDS || '', 10);

  if (!Number.isNaN(configured) && configured > 0) {
    return Math.min(configured, MAX_PRESIGNED_URL_TTL_SECONDS);
  }

  return MAX_PRESIGNED_URL_TTL_SECONDS;
}

async function uploadSingle(
  s3: S3Client,
  bucket: string,
  messageId: string,
  attachment: { filename?: string; contentType?: string; content?: Buffer | { type: 'Buffer'; data: number[] } }
): Promise<UploadedAttachment | null> {
  const filename = attachment.filename || 'attachment';
  const contentType = attachment.contentType || 'application/octet-stream';

  let content: Buffer;

  if (!attachment.content) {
    logger.warn({ context: LOG_CONTEXT, filename }, 'Attachment has no content, skipping upload');

    return null;
  }

  if (Buffer.isBuffer(attachment.content)) {
    content = attachment.content;
  } else if (attachment.content && (attachment.content as { type: string; data: number[] }).type === 'Buffer') {
    content = Buffer.from((attachment.content as { type: string; data: number[] }).data);
  } else {
    content = Buffer.from(attachment.content as unknown as string);
  }

  const storagePath = buildStorageKey(messageId, filename);

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

    return { uploaded: [], failedCount: attachments.length };
  }

  const s3 = buildS3Client();
  let failedCount = 0;

  const results = await Promise.all(
    attachments.map(async (attachment) => {
      try {
        return await uploadSingle(
          s3,
          bucket,
          messageId,
          attachment as { filename?: string; contentType?: string; content?: Buffer }
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
