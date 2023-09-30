import { api } from './api.client';

// eslint-disable-next-line @typescript-eslint/default-param-last
export function getActivityList(page = 0, filters) {
  return api.getFullResponse(`/v1/notifications`, {
    page,
    channels: filters?.channels,
    templates: filters?.templates,
    emails: filters?.email !== '' ? filters?.email : undefined,
    subscriberIds: filters?.subscriberId !== '' ? filters?.subscriberId : undefined,
    transactionId: filters?.transactionId !== '' ? filters?.transactionId : undefined,
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
