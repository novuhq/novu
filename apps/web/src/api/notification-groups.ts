import { api } from './api.client';

export function getNotificationGroups() {
  return api.get(`/v1/notification-groups`);
}
