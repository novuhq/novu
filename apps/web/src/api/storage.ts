import { api } from './api.client';

export function getSignedUrl(extension: string) {
  return api.get(`/v1/storage/upload-url?extension=${extension}`);
}
