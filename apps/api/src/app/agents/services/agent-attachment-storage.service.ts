import { Injectable } from '@nestjs/common';
import { PinoLogger, StorageService } from '@novu/application-generic';
import type { Attachment } from 'chat';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import { captureAgentWarning } from '../utils/capture-agent-sentry';

export interface StoredAttachment {
  type: string;
  name?: string;
  mimeType?: string;
  size?: number;
  storageKey: string;
  url?: string;
}

export interface StoreInboundAttachmentContext {
  organizationId: string;
  environmentId: string;
  conversationId: string;
  platformMessageId: string;
  platform?: AgentPlatformEnum;
}

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_MESSAGE = 15;
const MAX_AGGREGATE_ATTACHMENT_BYTES = 50 * 1024 * 1024;
export const READ_URL_TTL_SECONDS = 15 * 60;
const AGENTS_FOLDER = 'agents';

function sanitizeFilenameSegment(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

  return base || 'file';
}

function buildStorageKey(params: {
  organizationId: string;
  environmentId: string;
  conversationId: string;
  platformMessageId: string;
  index: number;
  filename: string;
}): string {
  const safeMessageId = String(params.platformMessageId).replace(/\//g, '_');

  return `${params.organizationId}/${params.environmentId}/${AGENTS_FOLDER}/${params.conversationId}/${safeMessageId}/${params.index}-${params.filename}`;
}

async function bufferFromAttachment(attachment: Attachment, allowUnknownSizeDownload = false): Promise<Buffer | null> {
  if (!attachment.data) {
    if (attachment.size == null && !allowUnknownSizeDownload) {
      throw new Error('Inbound attachment size is required before download');
    }

    if (attachment.size != null && attachment.size > MAX_ATTACHMENT_BYTES) {
      throw new Error('Inbound attachment exceeds size limit');
    }

    if (typeof attachment.fetchData === 'function') {
      return await attachment.fetchData();
    }

    return null;
  }

  if (Buffer.isBuffer(attachment.data)) {
    if (attachment.data.length > MAX_ATTACHMENT_BYTES) {
      throw new Error('Inbound attachment buffer exceeds size limit');
    }

    return attachment.data;
  }

  const blob = attachment.data as Blob;

  if (typeof blob.arrayBuffer === 'function') {
    if (attachment.size == null) {
      throw new Error('Inbound attachment size is required before reading blob data');
    }

    if (attachment.size > MAX_ATTACHMENT_BYTES) {
      throw new Error('Inbound attachment exceeds size limit');
    }

    if (blob.size !== attachment.size) {
      throw new Error('Inbound attachment blob size does not match trusted size metadata');
    }

    const ab = await blob.arrayBuffer();

    return Buffer.from(ab);
  }

  return null;
}

@Injectable()
export class AgentAttachmentStorage {
  constructor(
    private readonly storageService: StorageService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async storeInbound(
    attachments: Attachment[] | undefined,
    ctx: StoreInboundAttachmentContext
  ): Promise<StoredAttachment[]> {
    if (!attachments?.length) {
      return [];
    }

    const result: StoredAttachment[] = [];
    const attachmentsToProcess = attachments.slice(0, MAX_ATTACHMENTS_PER_MESSAGE);
    let processedBytes = 0;

    if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      this.logger.warn(
        { attachmentCount: attachments.length, cap: MAX_ATTACHMENTS_PER_MESSAGE },
        'Skipping inbound attachments over count limit'
      );
    }

    for (const [index, attachment] of attachmentsToProcess.entries()) {
      try {
        const knownSize = attachment.size;

        if (
          knownSize != null &&
          knownSize <= MAX_ATTACHMENT_BYTES &&
          processedBytes + knownSize > MAX_AGGREGATE_ATTACHMENT_BYTES
        ) {
          this.logger.warn(
            {
              size: knownSize,
              processedBytes,
              aggregateCap: MAX_AGGREGATE_ATTACHMENT_BYTES,
              name: attachment.name,
            },
            'Skipping inbound attachment over aggregate size limit'
          );

          continue;
        }

        const stored = await this.storeOne(attachment, ctx, index, processedBytes);

        if (stored) {
          processedBytes += stored.size ?? 0;
          result.push(stored);
        }
      } catch (err) {
        this.logger.warn(err, 'Inbound attachment processing failed');
        captureAgentWarning(err, { component: 'agent-attachment-storage', operation: 'store-inbound' });
      }
    }

    return result;
  }

  async signRead(storageKey: string): Promise<string | null> {
    const exists = await this.storageService.fileExists(storageKey);

    if (!exists) {
      return null;
    }

    return await this.storageService.getReadSignedUrl(storageKey, READ_URL_TTL_SECONDS);
  }

  private async storeOne(
    attachment: Attachment,
    ctx: StoreInboundAttachmentContext,
    index: number,
    processedBytes: number
  ): Promise<StoredAttachment | null> {
    try {
      if (attachment.size != null && attachment.size > MAX_ATTACHMENT_BYTES) {
        this.logger.warn(
          { size: attachment.size, name: attachment.name },
          'Skipping inbound attachment over size limit'
        );

        return null;
      }

      const allowUnknownSizeDownload = ctx.platform === AgentPlatformEnum.WHATSAPP;
      const buffer = await bufferFromAttachment(attachment, allowUnknownSizeDownload);

      if (!buffer) {
        this.logger.warn({ name: attachment.name }, 'Inbound attachment has neither fetchData nor data');

        return null;
      }

      if (buffer.length > MAX_ATTACHMENT_BYTES) {
        this.logger.warn(
          { byteLength: buffer.length, name: attachment.name },
          'Skipping inbound attachment over size limit after fetch'
        );

        return null;
      }

      if (processedBytes + buffer.length > MAX_AGGREGATE_ATTACHMENT_BYTES) {
        this.logger.warn(
          {
            byteLength: buffer.length,
            processedBytes,
            aggregateCap: MAX_AGGREGATE_ATTACHMENT_BYTES,
            name: attachment.name,
          },
          'Skipping inbound attachment over aggregate size limit after fetch'
        );

        return null;
      }

      const rawName = attachment.name ?? `file-${index}`;
      const filename = sanitizeFilenameSegment(rawName);
      const mimeType = attachment.mimeType ?? 'application/octet-stream';

      const storageKey = buildStorageKey({
        organizationId: ctx.organizationId,
        environmentId: ctx.environmentId,
        conversationId: ctx.conversationId,
        platformMessageId: ctx.platformMessageId,
        index,
        filename,
      });

      try {
        await this.storageService.uploadFile(storageKey, buffer, mimeType);
      } catch (err) {
        this.logger.warn(err, 'Failed to upload inbound attachment');
        captureAgentWarning(err, { component: 'agent-attachment-storage', operation: 'upload-inbound' });

        return null;
      }

      let url: string | undefined;
      try {
        url = await this.storageService.getReadSignedUrl(storageKey, READ_URL_TTL_SECONDS);
      } catch (err) {
        this.logger.warn(err, 'Failed to sign inbound attachment after upload');
        captureAgentWarning(err, { component: 'agent-attachment-storage', operation: 'sign-inbound-after-upload' });
      }

      return {
        type: attachment.type,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size ?? buffer.length,
        storageKey,
        url,
      };
    } catch (err) {
      this.logger.warn(err, 'Failed to store inbound attachment');
      captureAgentWarning(err, { component: 'agent-attachment-storage', operation: 'store-one' });

      return null;
    }
  }
}
