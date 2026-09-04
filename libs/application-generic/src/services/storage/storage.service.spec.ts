import { resolveStorageServiceClass } from './index';
import { NonExistingFileError } from './non-existing-file.error';
import { AzureBlobStorageService, GCSStorageService, S3StorageService } from './storage.service';

const azureUpload = jest.fn(() => Promise.resolve({ _response: { status: 201 } }));
const azureDownloadToBuffer = jest.fn();
const azureDeleteIfExists = jest.fn(() => Promise.resolve({ succeeded: true }));
const azureExists = jest.fn(() => Promise.resolve(true));

jest.mock('@azure/storage-blob', () => ({
  ...jest.requireActual('@azure/storage-blob'),
  StorageSharedKeyCredential: jest.fn(() => ({})),
  BlobServiceClient: jest.fn(() => ({
    getContainerClient: jest.fn(() => ({
      getBlockBlobClient: jest.fn(() => ({
        upload: azureUpload,
        downloadToBuffer: azureDownloadToBuffer,
        deleteIfExists: azureDeleteIfExists,
        exists: azureExists,
      })),
    })),
  })),
}));

describe('resolveStorageServiceClass', () => {
  it('selects Azure for STORAGE_SERVICE=AZURE (any case)', () => {
    expect(resolveStorageServiceClass('AZURE')).toBe(AzureBlobStorageService);
    expect(resolveStorageServiceClass('azure')).toBe(AzureBlobStorageService);
    expect(resolveStorageServiceClass('Azure')).toBe(AzureBlobStorageService);
  });

  it('selects GCS for STORAGE_SERVICE=GCS', () => {
    expect(resolveStorageServiceClass('GCS')).toBe(GCSStorageService);
  });

  it('defaults to S3 when unset or AWS', () => {
    expect(resolveStorageServiceClass(undefined)).toBe(S3StorageService);
    expect(resolveStorageServiceClass('')).toBe(S3StorageService);
    expect(resolveStorageServiceClass('AWS')).toBe(S3StorageService);
  });
});

describe('AzureBlobStorageService email attachment handoff', () => {
  const key = 'org-id/env-id/random/invoice.pdf';
  const file = Buffer.from('invoice-bytes');
  let service: AzureBlobStorageService;

  beforeAll(() => {
    process.env.AZURE_ACCOUNT_NAME = 'novu';
    process.env.AZURE_ACCOUNT_KEY = '123456';
    process.env.AZURE_CONTAINER_NAME = 'novu-test';
    process.env.AZURE_HOST_NAME = 'https://novu.blob.core.windows.net';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    azureDownloadToBuffer.mockResolvedValue(file);
    service = new AzureBlobStorageService();
  });

  it('uploads an attachment with the given content type', async () => {
    await service.uploadFile(key, file, 'application/pdf');

    expect(azureUpload).toHaveBeenCalledWith(file, file.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/pdf',
      },
    });
  });

  it('downloads an attachment for the worker send path', async () => {
    const downloaded = await service.getFile(key);

    expect(downloaded).toEqual(file);
    expect(azureDownloadToBuffer).toHaveBeenCalledTimes(1);
  });

  it('maps BlobNotFound to NonExistingFileError', async () => {
    azureDownloadToBuffer.mockRejectedValueOnce({ code: 'BlobNotFound', statusCode: 404 });

    await expect(service.getFile(key)).rejects.toBeInstanceOf(NonExistingFileError);
  });

  it('does not treat ContainerNotFound as a missing attachment', async () => {
    const containerMissing = { code: 'ContainerNotFound', statusCode: 404 };
    azureDownloadToBuffer.mockRejectedValueOnce(containerMissing);

    await expect(service.getFile(key)).rejects.toEqual(containerMissing);
  });

  it('awaits blob deletion after the email is sent', async () => {
    await service.deleteFile(key);

    expect(azureDeleteIfExists).toHaveBeenCalledTimes(1);
  });
});
