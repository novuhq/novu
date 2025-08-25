import { S3Client } from '@aws-sdk/client-s3';
import { BlockBlobClient } from '@azure/storage-blob';
import { File } from '@google-cloud/storage';
import { IAttachmentOptionsExtended } from '@novu/stateless';
import { AzureBlobStorageService, GCSStorageService, S3StorageService } from './storage.service';
import { StorageHelperService } from './storage-helper.service';

const file = Buffer.from('test');
const gcpFileSave = jest.fn(() => Promise.resolve({}));
const gcpDownload = jest.fn(() => Promise.resolve([file]));
const gcpDelete = jest.fn(() => Promise.resolve({}));

const azureUpload = jest.fn(() => Promise.resolve({ _response: { status: 201 } }));
const azureDownloadToBuffer = jest.fn(() => Promise.resolve(file));
const azureDelete = jest.fn(() => Promise.resolve({ _response: { status: 202 } }));

jest.mock('@aws-sdk/client-s3');
jest.mock('@azure/storage-blob', () => ({
  ...jest.requireActual('@azure/storage-blob'),
  StorageSharedKeyCredential: jest.fn(() => ({})),
  BlobServiceClient: jest.fn(() => ({
    getContainerClient: jest.fn(() => ({
      getBlockBlobClient: jest.fn(() => ({
        upload: azureUpload,
        downloadToBuffer: azureDownloadToBuffer,
        delete: azureDelete,
      })),
    })),
  })),
}));
jest.mock('@google-cloud/storage', () => ({
  ...jest.requireActual('@google-cloud/storage'),
  Storage: jest.fn(() => ({
    bucket: () => ({
      file: jest.fn(() => ({
        save: gcpFileSave,
        delete: gcpDelete,
        download: gcpDownload,
      })),
    }),
  })),
}));

describe('Storage-Helper service', () => {
  beforeAll(() => {
    jest.resetModules();
    process.env = {
      ...process.env,
      GCS_BUCKET_NAME: 'test_bucket',
      AZURE_CONTAINER_NAME: 'test_bucket',
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // mocking the S3 Storage service with jest
  describe('S3', () => {
    const s3StorageHelperService = new StorageHelperService(new S3StorageService());
    const attachments: IAttachmentOptionsExtended[] = [
      {
        name: 'test.png',
        file: Buffer.from('test'),
        storagePath: 'attachments/test.png',
        mime: 'image/png',
      },
    ];
    const resultAttachments = attachments.map((attachment) => {
      attachment.file = null;

      return attachment;
    });

    it('should upload file', async () => {
      // resolve PutObjectCommand
      jest.spyOn(S3Client.prototype, 'send').mockImplementation(() => Promise.resolve({}));

      await s3StorageHelperService.uploadAttachments(attachments);
    });

    it('should get file', async () => {
      // resolve GetObjectCommand with the file
      jest.spyOn(S3Client.prototype, 'send').mockImplementation(() =>
        Promise.resolve({
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
        })
      );

      await s3StorageHelperService.getAttachments(attachments);
    });

    it('should delete file', async () => {
      // resolve DeleteObjectCommand
      jest.spyOn(S3Client.prototype, 'send').mockImplementation(() => Promise.resolve({}));

      await s3StorageHelperService.deleteAttachments(resultAttachments);
    });

    it('should handle error for file which is not found', async () => {
      const attachments2: IAttachmentOptionsExtended[] = [
        {
          name: 'new-image.png',
          storagePath: 'attachments/new-image.png',
          file: null,
          mime: 'image/png',
        },
      ];
      jest
        .spyOn(S3Client.prototype, 'send')
        .mockImplementation(() => Promise.reject({ message: 'The specified key does not exist.' }));

      await s3StorageHelperService.getAttachments(attachments2);
      expect(attachments2[0].file).toBeNull();
    });
  });

  // mocking the google cloud storage service with jest
  describe('Google Cloud', () => {
    const gCSStorageHelperService = new StorageHelperService(new GCSStorageService());
    const gcAttachments: IAttachmentOptionsExtended[] = [
      {
        name: 'test.png',
        storagePath: 'attachments/test.png',
        file: Buffer.from('test'),
        mime: 'image/png',
      },
    ];

    it('should upload file', async () => {
      await gCSStorageHelperService.uploadAttachments(gcAttachments);

      expect(gcpFileSave).toHaveBeenCalledTimes(1);
    });

    it('should delete file', async () => {
      await gCSStorageHelperService.deleteAttachments(gcAttachments);

      expect(gcpDelete).toHaveBeenCalledTimes(1);
    });

    it('should get file', async () => {
      await gCSStorageHelperService.getAttachments(gcAttachments);

      expect(gcpDownload).toHaveBeenCalledTimes(1);
      expect(gcAttachments[0].file).toEqual(file);
    });

    it('should handle error for file which is not found', async () => {
      const gcAttachments2: IAttachmentOptionsExtended[] = [
        {
          name: 'new-image.png',
          storagePath: 'attachments/new-image.png',
          file: null,
          mime: 'image/png',
        },
      ];
      gcpDownload.mockImplementationOnce(() => Promise.reject({ code: 404 }));
      await gCSStorageHelperService.getAttachments(gcAttachments2);

      expect(gcAttachments2[0].file).toBeNull();
    });
  });

  // mocking the azure storage service with jest
  describe('Azure', () => {
    const azureStorageHelperService = new StorageHelperService(new AzureBlobStorageService());
    const azureAttachments: IAttachmentOptionsExtended[] = [
      {
        name: 'test.png',
        storagePath: 'attachments/test.png',
        file: Buffer.from('test'),
        mime: 'image/png',
      },
    ];

    it('should upload file', async () => {
      await azureStorageHelperService.uploadAttachments(azureAttachments);

      expect(azureUpload).toHaveBeenCalledTimes(1);
    });

    it('should delete file', async () => {
      await azureStorageHelperService.deleteAttachments(azureAttachments);

      expect(azureDelete).toHaveBeenCalledTimes(1);
    });

    it('should get file', async () => {
      await azureStorageHelperService.getAttachments(azureAttachments);

      expect(azureDownloadToBuffer).toHaveBeenCalledTimes(1);
      expect(azureAttachments[0].file).toBeInstanceOf(Buffer);
    });

    it('should handle error for file which is not found', async () => {
      const azureAttachments2: IAttachmentOptionsExtended[] = [
        {
          name: 'new-image.png',
          storagePath: 'attachments/new-image.png',
          file: null,
          mime: 'image/png',
        },
      ];
      azureDownloadToBuffer.mockImplementationOnce(() => Promise.reject({ statusCode: 404 }));
      // sets the file to null if the get-file method throws error with status code 404
      await azureStorageHelperService.getAttachments(azureAttachments2);

      expect(azureDownloadToBuffer).toHaveBeenCalledTimes(1);
      expect(azureAttachments2[0].file).toBeNull();
    });
  });
});
