import { api } from './api.client';

// eslint-disable-next-line @typescript-eslint/default-param-last
export function getActivityList(page = 0, filters) {
  return api.getFullResponse(`/v1/notifications`, {
    page,
    channels: filters?.channels,
    templates: filters?.templates,
    search: filters?.search,
    transactionId: filters?.transactionId,
  });
}

export function getNotification(notificationId: string) {
  return api.getFullResponse(`/v1/notifications/${notificationId}`);
}

export function getActivityStats() {
  return api.get(`/v1/notifications/stats`);
}

export function getActivityGraphStats() {
  return api.get(`/v1/notifications/graph/stats`);
}
