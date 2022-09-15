import { Injectable } from '@nestjs/common';
import { IAttachmentOptions } from '@novu/stateless';
import { StorageService } from '../../../shared/services/storage/storage.service';

@Injectable()
export class StorageHelperService {
  constructor(private storageService: StorageService) {}

  async uploadAttachments(attachments?: IAttachmentOptions[]) {
    if (!Array.isArray(attachments) || attachments.length === 0) {
      return;
    }

    const promises = attachments.map(async (attachment) => {
      if (attachment.file) {
        await this.storageService.uploadFile(attachment.name, attachment.file, attachment.mime);
      }
    });
    await Promise.all(promises);
  }

  async getAttachments(attachments?: IAttachmentOptions[]) {
    if (!Array.isArray(attachments) || attachments.length === 0) {
      return;
    }

    for (const attachment of attachments) {
      attachment.file = await this.storageService.getFile(attachment.name);
    }
  }

  async deleteAttachments(attachments?: IAttachmentOptions[]) {
    if (!Array.isArray(attachments) || attachments.length === 0) {
      return;
    }

    for (const attachment of attachments) {
      if (attachment.file) {
        await this.storageService.deleteFile(attachment.name);
      }
    }
  }
}
