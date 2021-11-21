import { api } from './api.client';

export function getActivityList(page = 0, filters) {
  return api.getFullResponse(`/v1/activity`, {
    page,
    channels: filters?.channels,
    templates: filters?.templates,
    search: filters?.search,
  });
}

export function getActivityStats() {
  return api.get(`/v1/activity/stats`);
}
