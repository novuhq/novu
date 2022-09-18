import { assert, expect } from 'chai';
import { S3StorageService } from '../../../shared/services/storage/storage.service';
import { StorageHelperService } from './storage-helper.service';

describe('Storage-Helper service', function () {
  describe('S3', function () {
    let S3StorageHelperService = new StorageHelperService(new S3StorageService());
    let attachments = [
      {
        name: 'test.png',
        file: Buffer.from('test'),
        mime: 'image/png',
      },
    ];
    let resultAttachments = attachments.map((attachment) => {
      attachment.file = null;
      return attachment;
    });

    it('should upload file', async function () {
      await S3StorageHelperService.uploadAttachments(attachments);

      await S3StorageHelperService.getAttachments(resultAttachments);
      expect(resultAttachments).to.not.be.null;
    });

    it('should delete file', async function () {
      await S3StorageHelperService.deleteAttachments(attachments);

      await S3StorageHelperService.getAttachments(resultAttachments);
      expect(resultAttachments[0].file).to.be.null;
    });
  });
});
