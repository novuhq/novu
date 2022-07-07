import { api } from './api.client';

export async function getFeeds() {
  return api.get(`/v1/feeds`);
}

export async function createFeed(data: { name: string }) {
  return api.post(`/v1/feeds`, data);
}

export async function deleteFeed(feedId: string) {
  return api.delete(`/v1/feeds/${feedId}`, {});
}
