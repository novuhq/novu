import { expect } from 'chai';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { S3StorageService } from '../../../shared/services/storage/storage.service';
import { StorageHelperService } from './storage-helper.service';

const s3Mock = mockClient(S3Client);

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
      // resolve PutObjectCommand
      s3Mock.on(PutObjectCommand).resolves({});
      await S3StorageHelperService.uploadAttachments(attachments);

      // resolve GetObjectCommand with the file
      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          // @ts-ignore
          on: (event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('test'));
            }
            if (event === 'end') {
              callback();
            }
          },
        },
      });
      await S3StorageHelperService.getAttachments(resultAttachments);
      expect(resultAttachments).to.not.be.null;
    });

    it('should delete file', async function () {
      // resolve DeleteObjetCommand
      s3Mock.on(DeleteObjectCommand).resolves({});
      await S3StorageHelperService.deleteAttachments(attachments);

      // reject GetObjectCommand with error
      s3Mock.on(GetObjectCommand).rejects('The specified key does not exist.');
      await S3StorageHelperService.getAttachments(resultAttachments);
      expect(resultAttachments[0].file).to.be.null;
    });
  });
});
