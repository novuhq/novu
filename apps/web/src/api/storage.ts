import { api } from './api.client';
import { MimeTypesEnum } from '@novu/shared';

export function getSignedUrl(extension: string) {
  return api.get(`/v1/storage/upload-url?extension=${extension}`);
}

export function getSignedUrlForProfileImage(extension: MimeTypesEnum) {
  return api.get(`/v1/storage/upload-url/profile?extension=${extension}`);
}
