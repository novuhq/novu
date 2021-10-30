import { api } from './api.client';

export function getNotificationsList() {
  return api.get(`/v1/notification-templates`);
}

export function getNotificationGroups() {
  return api.get(`/v1/notification-groups`);
}
