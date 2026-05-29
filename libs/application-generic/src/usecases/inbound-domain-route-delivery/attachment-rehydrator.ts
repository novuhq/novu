import { Injectable, Logger } from '@nestjs/common';
import { InboundEmailAttachment } from '@novu/shared';
import { IInboundParseAttachment } from '../../dtos/inbound-parse-job.dto';
import { NonExistingFileError } from '../../services/storage/non-existing-file.error';
import { StorageService } from '../../services/storage/storage.service';

const LOG_CONTEXT = 'AttachmentRehydrator';

@Injectable()
export class AttachmentRehydrator {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Downloads each attachment from S3 and embeds the binary `content` back into
   * the attachment object so legacy webhook consumers keep receiving the same shape
   * they relied on before S3 offloading was introduced.
   *
   * This rehydration is intentionally performed only for the legacy domain-route and
   * reply-to webhook paths. The agent webhook receives metadata + URL only.
   *
   * Per-attachment S3 failures are handled gracefully: `content` is set to `null`
   * and a warning is logged; the attachment is still included with its `url` so
   * customers that have already migrated are unaffected.
   */
  async rehydrate(attachments: IInboundParseAttachment[] | undefined): Promise<InboundEmailAttachment[]> {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    const results = await Promise.all(attachments.map((attachment) => this.rehydrateSingle(attachment)));

    return results;
  }

  private async rehydrateSingle(attachment: IInboundParseAttachment): Promise<InboundEmailAttachment> {
    try {
      const fileBuffer = await this.storageService.getFile(attachment.storagePath);

      return {
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        url: attachment.url,
        storagePath: attachment.storagePath,
        content: {
          type: 'Buffer',
          data: Array.from(fileBuffer),
        },
        contentBytes: attachment.size,
      };
    } catch (err) {
      if (err instanceof NonExistingFileError || (err as { name?: string }).name === 'NonExistingFileError') {
        Logger.warn(
          { storagePath: attachment.storagePath, filename: attachment.filename },
          'Attachment not found in S3 during rehydration — content will be null',
          LOG_CONTEXT
        );
      } else {
        Logger.error(
          { err, storagePath: attachment.storagePath, filename: attachment.filename },
          'Failed to rehydrate attachment from S3',
          LOG_CONTEXT
        );
      }

      return {
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        url: attachment.url,
        storagePath: attachment.storagePath,
        content: null,
        contentBytes: attachment.size,
      };
    }
  }
}
