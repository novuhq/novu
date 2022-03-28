import { api } from './api.client';

// eslint-disable-next-line @typescript-eslint/default-param-last
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
