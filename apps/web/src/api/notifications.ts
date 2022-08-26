import { api } from './api.client';

export function getNotificationsList(page = 0, usePagination = false) {
  const _usePagination = usePagination ? 1 : 0;

  return api.getFullResponse(`/v1/notification-templates`, { page, usePagination: _usePagination });
}

export function getNotificationGroups() {
  return api.get(`/v1/notification-groups`);
}
