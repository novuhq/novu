import { AzureBlobStorageService, GCSStorageService, S3StorageService, StorageService } from './storage.service';

export * from './storage-helper.service';

export function resolveStorageServiceClass(service?: string) {
  switch ((service || '').toUpperCase()) {
    case 'GCS':
      return GCSStorageService;
    case 'AZURE':
      return AzureBlobStorageService;
    default:
      return S3StorageService;
  }
}

export const storageService = {
  provide: StorageService,
  useClass: resolveStorageServiceClass(process.env.STORAGE_SERVICE),
};

export { StorageService };
