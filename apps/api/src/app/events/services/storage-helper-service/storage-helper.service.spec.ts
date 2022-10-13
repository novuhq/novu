import * as sinon from 'sinon';
import { expect } from 'chai';
import { File } from '@google-cloud/storage';
import { S3Client } from '@aws-sdk/client-s3';
import { BlockBlobClient } from '@azure/storage-blob';
import { StorageHelperService } from './storage-helper.service';
import {
  S3StorageService,
  GCSStorageService,
  AzureBlobStorageService,
} from '../../../shared/services/storage/storage.service';
import { IAttachmentOptionsExtended } from '@novu/stateless';

describe('Storage-Helper service', function () {
  // mocking the S3 Storage service with sinon
  describe('S3', function () {
    let S3StorageHelperService = new StorageHelperService(new S3StorageService());
    let attachments: IAttachmentOptionsExtended[] = [
      {
        name: 'test.png',
        file: Buffer.from('test'),
        storagePath: 'attachments/test.png',
        mime: 'image/png',
      },
    ];
    let resultAttachments = attachments.map((attachment) => {
      attachment.file = null;
      return attachment;
    });

    it('should upload file', async function () {
      // resolve PutObjectCommand
      sinon.stub(S3Client.prototype, 'send').resolves({});
      await S3StorageHelperService.uploadAttachments(attachments);
    });

    it('should get file', async function () {
      // resolve GetObjectCommand with the file
      sinon.stub(S3Client.prototype, 'send').resolves({
        Body: {
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
      await S3StorageHelperService.getAttachments(attachments);
    });

    it('should delete file', async function () {
      // resolve DeleteObjectCommand
      sinon.stub(S3Client.prototype, 'send').resolves({});
      await S3StorageHelperService.deleteAttachments(resultAttachments);
    });

    it('should handle error for file which is not found', async function () {
      let attachments2: IAttachmentOptionsExtended[] = [
        {
          name: 'new-image.png',
          storagePath: 'attachments/new-image.png',
          file: null,
          mime: 'image/png',
        },
      ];
      sinon.stub(S3Client.prototype, 'send').rejects({ message: 'The specified key does not exist.' });
      await S3StorageHelperService.getAttachments(attachments2);
      expect(attachments2[0].file).to.be.null;
    });
  });

  // mocking the google cloud storage service with sinon
  describe('Google Cloud', function () {
    afterEach(() => {
      sinon.restore();
    });
    let GCSStorageHelperService = new StorageHelperService(new GCSStorageService());
    let gcAttachments: IAttachmentOptionsExtended[] = [
      {
        name: 'test.png',
        storagePath: 'attachments/test.png',
        file: Buffer.from('test'),
        mime: 'image/png',
      },
    ];

    it('should upload file', async function () {
      // resolve upload
      const bucketStub = sinon.stub(File.prototype, 'save').resolves(gcAttachments);
      await GCSStorageHelperService.uploadAttachments(gcAttachments);
      sinon.assert.calledOnce(bucketStub);
    });

    it('should delete file', async function () {
      // resolve delete
      const bucketStub = sinon.stub(File.prototype, 'delete').resolves(gcAttachments);
      await GCSStorageHelperService.deleteAttachments(gcAttachments);
      sinon.assert.calledOnce(bucketStub);
    });

    it('should get file', async function () {
      // resolve get
      const bucketStub = sinon.stub(File.prototype, 'download').resolves(gcAttachments);
      await GCSStorageHelperService.getAttachments(gcAttachments);
      sinon.assert.calledOnce(bucketStub);
    });

    it('should handle error for file which is not found', async function () {
      let gcAttachments2: IAttachmentOptionsExtended[] = [
        {
          name: 'new-image.png',
          storagePath: 'attachments/new-image.png',
          file: null,
          mime: 'image/png',
        },
      ];
      sinon.stub(File.prototype, 'download').rejects({ code: 404 });
      await GCSStorageHelperService.getAttachments(gcAttachments2);
      expect(gcAttachments2[0].file).to.be.null;
    });
  });

  // mocking the azure storage service with sinon
  describe('Azure', function () {
    afterEach(() => {
      sinon.restore();
    });
    let AzureStorageHelperService = new StorageHelperService(new AzureBlobStorageService());
    let azureAttachments: IAttachmentOptionsExtended[] = [
      {
        name: 'test.png',
        storagePath: 'attachments/test.png',
        file: Buffer.from('test'),
        mime: 'image/png',
      },
    ];

    it('should upload file', async function () {
      // @ts-ignore
      const uploadStub = sinon.stub(BlockBlobClient.prototype, 'upload').resolves({ _response: { status: 201 } });
      await AzureStorageHelperService.uploadAttachments(azureAttachments);
      sinon.assert.calledOnce(uploadStub);
    });

    it('should delete file', async function () {
      // @ts-ignore
      const deleteStub = sinon.stub(BlockBlobClient.prototype, 'delete').resolves({ _response: { status: 202 } });
      await AzureStorageHelperService.deleteAttachments(azureAttachments);
      sinon.assert.calledOnce(deleteStub);
    });

    it('should get file', async function () {
      sinon.stub(BlockBlobClient.prototype, 'downloadToBuffer').resolves(Buffer.from('test'));
      await AzureStorageHelperService.getAttachments(azureAttachments);
      expect(azureAttachments[0].file).to.be.an.instanceOf(Buffer);
    });

    it('should handle error for file which is not found', async function () {
      let azureAttachments2: IAttachmentOptionsExtended[] = [
        {
          name: 'new-image.png',
          storagePath: 'attachments/new-image.png',
          file: null,
          mime: 'image/png',
        },
      ];
      sinon.stub(BlockBlobClient.prototype, 'downloadToBuffer').rejects({ statusCode: 404 });
      // sets the file to null if the get-file method throws error with status code 404
      await AzureStorageHelperService.getAttachments(azureAttachments2);
      expect(azureAttachments2[0].file).to.be.null;
    });
  });
});
