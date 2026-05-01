import { Injectable } from '@nestjs/common';
import { PinoLogger, StorageService } from '@novu/application-generic';
import type { Attachment } from 'chat';

export interface StoredAttachment {
  type: string;
  name?: string;
  mimeType?: string;
  size?: number;
  storageKey: string;
  url: string;
}

export interface StoreInboundAttachmentContext {
  organizationId: string;
  environmentId: string;
  conversationId: string;
  platformMessageId: string;
}

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
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

async function bufferFromAttachment(attachment: Attachment): Promise<Buffer | null> {
  if (typeof attachment.fetchData === 'function') {
    return await attachment.fetchData();
  }

  if (!attachment.data) {
    return null;
  }

  if (Buffer.isBuffer(attachment.data)) {
    return attachment.data;
  }

  const blob = attachment.data as Blob;

  if (typeof blob.arrayBuffer === 'function') {
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

    const settled = await Promise.allSettled(
      attachments.map((attachment, index) => this.storeOne(attachment, ctx, index))
    );

    const result: StoredAttachment[] = [];

    for (const entry of settled) {
      if (entry.status === 'fulfilled' && entry.value) {
        result.push(entry.value);
      }

      if (entry.status === 'rejected') {
        this.logger.warn(entry.reason, 'Inbound attachment processing failed');
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
    index: number
  ): Promise<StoredAttachment | null> {
    try {
      if (attachment.size != null && attachment.size > MAX_ATTACHMENT_BYTES) {
        this.logger.warn(
          { size: attachment.size, name: attachment.name },
          'Skipping inbound attachment over size limit'
        );

        return null;
      }

      const buffer = await bufferFromAttachment(attachment);

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

      await this.storageService.uploadFile(storageKey, buffer, mimeType);

      const url = await this.storageService.getReadSignedUrl(storageKey, READ_URL_TTL_SECONDS);

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

      return null;
    }
  }
}
