import { resolveStorageServiceClass } from './index';
import { NonExistingFileError } from './non-existing-file.error';
import { AzureBlobStorageService, GCSStorageService, S3StorageService } from './storage.service';

const azureUpload = jest.fn(() => Promise.resolve({ _response: { status: 201 } }));
const azureDownloadToBuffer = jest.fn();
const azureDeleteIfExists = jest.fn(() => Promise.resolve({ succeeded: true }));
const azureExists = jest.fn(() => Promise.resolve(true));

const gcsSave = jest.fn(() => Promise.resolve());
const gcsDownload = jest.fn();
const gcsDelete = jest.fn(() => Promise.resolve());
const gcsExists = jest.fn(() => Promise.resolve([true]));
const gcsGetSignedUrl = jest.fn();

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

jest.mock('@google-cloud/storage', () => ({
  ...jest.requireActual('@google-cloud/storage'),
  Storage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({
        save: gcsSave,
        download: gcsDownload,
        delete: gcsDelete,
        exists: gcsExists,
        getSignedUrl: gcsGetSignedUrl,
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

  it('selects GCS for STORAGE_SERVICE=GCS (any case)', () => {
    expect(resolveStorageServiceClass('GCS')).toBe(GCSStorageService);
    expect(resolveStorageServiceClass('gcs')).toBe(GCSStorageService);
    expect(resolveStorageServiceClass('Gcs')).toBe(GCSStorageService);
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

describe('GCSStorageService email attachment handoff', () => {
  const key = 'org-id/env-id/random/invoice.pdf';
  const file = Buffer.from('invoice-bytes');
  let service: GCSStorageService;

  beforeAll(() => {
    process.env.GCS_BUCKET_NAME = 'novu-test';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    gcsDownload.mockResolvedValue([file]);
    service = new GCSStorageService();
  });

  it('uploads an attachment with the given content type using a simple upload', async () => {
    await service.uploadFile(key, file, 'application/pdf');

    expect(gcsSave).toHaveBeenCalledWith(file, {
      contentType: 'application/pdf',
      resumable: false,
    });
  });

  it('downloads an attachment for the worker send path', async () => {
    const downloaded = await service.getFile(key);

    expect(downloaded).toEqual(file);
    expect(gcsDownload).toHaveBeenCalledTimes(1);
  });

  it('maps object 404 to NonExistingFileError', async () => {
    gcsDownload.mockRejectedValueOnce({
      code: 404,
      message: 'No such object: novu-test/org-id/env-id/random/invoice.pdf',
    });

    await expect(service.getFile(key)).rejects.toBeInstanceOf(NonExistingFileError);
  });

  it('does not treat a missing bucket as a missing attachment', async () => {
    const bucketMissing = { code: 404, message: 'The specified bucket does not exist.' };
    gcsDownload.mockRejectedValueOnce(bucketMissing);

    await expect(service.getFile(key)).rejects.toEqual(bucketMissing);
  });

  it('does not finish deleting until the GCS delete resolves', async () => {
    let resolveDelete: () => void = () => undefined;
    gcsDelete.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        })
    );

    let settled = false;
    const pending = service.deleteFile(key).then(() => {
      settled = true;
    });

    expect(gcsDelete).toHaveBeenCalledWith({ ignoreNotFound: true });
    await Promise.resolve();
    expect(settled).toBe(false);

    resolveDelete();
    await pending;

    expect(settled).toBe(true);
  });

  describe('branding and profile public path', () => {
    const signedWriteUrl = 'https://storage.googleapis.com/novu-test/org-id/logo.png?X-Goog-Signature=abc';

    afterEach(() => {
      delete process.env.GCS_DOMAIN;
      delete process.env.CDN_URL;
    });

    it('uses GCS_DOMAIN for the durable public path', async () => {
      process.env.GCS_DOMAIN = 'https://cdn.example.com';
      gcsGetSignedUrl.mockResolvedValueOnce([signedWriteUrl]);

      const result = await service.getSignedUrl('org-id/logo.png', 'image/png');

      expect(result.signedUrl).toBe(signedWriteUrl);
      expect(result.path).toBe('https://cdn.example.com/novu-test/org-id/logo.png');
    });

    it('prefers CDN_URL when set', async () => {
      process.env.CDN_URL = 'https://assets.novu.co';
      gcsGetSignedUrl.mockResolvedValueOnce([signedWriteUrl]);

      const result = await service.getSignedUrl('org-id/logo.png', 'image/png');

      expect(result.path).toBe('https://assets.novu.co/org-id/logo.png');
    });

    it('does not return an unsigned object URL when no public domain is configured', async () => {
      gcsGetSignedUrl.mockResolvedValueOnce([signedWriteUrl]);

      await expect(service.getSignedUrl('org-id/logo.png', 'image/png')).rejects.toThrow(
        'GCS_DOMAIN or CDN_URL is required for public branding and profile upload paths'
      );
    });
  });
});
