import { api } from './api.client';

export function getNotificationsList(page = 0, limit = 10) {
  return api.getFullResponse(`/v1/notification-templates`, { page, limit });
}

export function getNotificationGroups() {
  return api.get(`/v1/notification-groups`);
}
