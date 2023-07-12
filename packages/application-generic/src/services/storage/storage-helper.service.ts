import { Injectable } from '@nestjs/common';
import { IAttachmentOptionsExtended } from '@novu/stateless';

import { NonExistingFileError } from './non-existing-file.error';
import { StorageService } from './storage.service';
import { Instrument } from '../../instrumentation';

@Injectable()
export class StorageHelperService {
  constructor(private storageService: StorageService) {}

  private areAttachmentsMissing(attachments?: IAttachmentOptionsExtended[]) {
    return !(Array.isArray(attachments) && attachments.length > 0);
  }

  @Instrument()
  async uploadAttachments(attachments?: IAttachmentOptionsExtended[]) {
    if (!attachments || this.areAttachmentsMissing(attachments)) {
      return;
    }

    const promises = attachments.map(async (attachment) => {
      if (attachment.file) {
        await this.storageService.uploadFile(
          attachment.storagePath,
          attachment.file,
          attachment.mime
        );
      }
    });
    await Promise.all(promises);
  }

  async getAttachments(attachments?: IAttachmentOptionsExtended[]) {
    if (!attachments || this.areAttachmentsMissing(attachments)) {
      return;
    }

    for (const attachment of attachments) {
      try {
        attachment.file = await this.storageService.getFile(
          attachment.storagePath
        );
      } catch (error: any) {
        if (
          error instanceof NonExistingFileError ||
          error.name === 'NonExistingFileError'
        ) {
          attachment.file = null;
        } else {
          throw error;
        }
      }
    }
  }

  async deleteAttachments(attachments?: IAttachmentOptionsExtended[]) {
    if (!attachments || this.areAttachmentsMissing(attachments)) {
      return;
    }

    for (const attachment of attachments) {
      if (attachment.file) {
        await this.storageService.deleteFile(attachment.storagePath);
      }
    }
  }
}
