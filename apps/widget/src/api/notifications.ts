import { get, post } from './api.service';

export async function getNotificationsList(page: number) {
  return await get(`/widgets/notifications/feed?page=${page}`);
}

export async function getUnseenCount() {
  return await get('/widgets/notifications/unseen');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function markMessageAsSeen(messageId: string): Promise<any> {
  return await post(`/widgets/messages/${messageId}/seen`, {});
}
