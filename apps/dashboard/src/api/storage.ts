import type { FileExtensionEnum, IEnvironment, UploadTypesEnum } from '@novu/shared';
import { get } from './api.client';

export type UploadUrlResponse = {
  signedUrl: string;
  path: string;
  additionalHeaders?: Record<string, string>;
};

export async function getSignedUploadUrl({
  environment,
  extension,
  type,
}: {
  environment: IEnvironment;
  extension: FileExtensionEnum;
  type: UploadTypesEnum;
}): Promise<{ data: UploadUrlResponse }> {
  return get(`/storage/upload-url?extension=${extension}&type=${type}`, { environment });
}
