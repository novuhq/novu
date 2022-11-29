import { api } from './api.client';

export function getSubscribersList(page = 0, limit = 10) {
  return api.getFullResponse(`/v1/subscribers`, { page, limit });
}
