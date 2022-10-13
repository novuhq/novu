import { Injectable } from '@nestjs/common';
import { IAttachmentOptionsExtended } from '@novu/stateless';
import { NonExistingFileError } from '../../../shared/errors/non-existing-file.error';
import { StorageService } from '../../../shared/services/storage/storage.service';

@Injectable()
export class StorageHelperService {
  constructor(private storageService: StorageService) {}

  private areAttachmentsMissing(attachments?: IAttachmentOptionsExtended[]) {
    return !(Array.isArray(attachments) && attachments.length > 0);
  }

  async uploadAttachments(attachments?: IAttachmentOptionsExtended[]) {
    if (this.areAttachmentsMissing(attachments)) {
      return;
    }

    const promises = attachments.map(async (attachment) => {
      if (attachment.file) {
        await this.storageService.uploadFile(attachment.storagePath, attachment.file, attachment.mime);
      }
    });
    await Promise.all(promises);
  }

  async getAttachments(attachments?: IAttachmentOptionsExtended[]) {
    if (this.areAttachmentsMissing(attachments)) {
      return;
    }

    for (const attachment of attachments) {
      try {
        attachment.file = await this.storageService.getFile(attachment.storagePath);
      } catch (error) {
        if (error instanceof NonExistingFileError) {
          attachment.file = null;
        } else {
          throw error;
        }
      }
    }
  }

  async deleteAttachments(attachments?: IAttachmentOptionsExtended[]) {
    if (this.areAttachmentsMissing(attachments)) {
      return;
    }

    for (const attachment of attachments) {
      if (attachment.file) {
        await this.storageService.deleteFile(attachment.storagePath);
      }
    }
  }
}
