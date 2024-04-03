import { UploadTypesEnum } from '@novu/shared';
import { api } from './api.client';

export interface IGetSignedUrlParams {
  extension: string;
  type?: UploadTypesEnum;
}

export interface ISignedUrlResponse {
  signedUrl: string;
  path: string;
  additionalHeaders: object;
}

export function getSignedUrl({ extension, type }: IGetSignedUrlParams): Promise<ISignedUrlResponse> {
  const typeQuery = type ? `&type=${type}` : '';

  return api.get(`/v1/storage/upload-url?extension=${extension}${typeQuery}`);
}

export function getSignedUrlForProfileImage(extension: string) {
  return api.get(`/v1/storage/upload-url/profile?extension=${extension}`);
}
