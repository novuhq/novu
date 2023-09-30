import {
  AzureBlobStorageService,
  GCSStorageService,
  S3StorageService,
  StorageService,
} from './storage.service';

export * from './storage-helper.service';

function getStorageServiceClass(service: string) {
  switch (service) {
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
  useClass: getStorageServiceClass(String(process.env.STORAGE_SERVICE)),
};

export { StorageService };
