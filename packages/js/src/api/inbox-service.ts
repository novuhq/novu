import { ApiOptions, HttpClient } from '@novu/client';
import type { Session } from '../types';
import type { ButtonTypeEnum, Notification, NotificationFilter } from './types';

export type InboxServiceOptions = ApiOptions;

export class InboxService {
  #token: string | undefined;
  #httpClient: HttpClient;

  constructor(options: InboxServiceOptions = {}) {
    this.#httpClient = new HttpClient(options);
  }

  async initializeSession({
    applicationIdentifier,
    subscriberId,
    subscriberHash,
  }: {
    applicationIdentifier: string;
    subscriberId: string;
    subscriberHash?: string;
  }): Promise<Session> {
    const response = (await this.#httpClient.post(`/inbox/session`, {
      applicationIdentifier,
      subscriberId,
      subscriberHash,
    })) as Session;

    this.#token = response.token;

    return response;
  }

  async fetchNotifications({
    after,
    archived,
    limit,
    offset,
    read,
    tags,
  }: {
    tags?: Notification['tags'];
    read?: boolean;
    archived?: boolean;
    limit?: number;
    after?: string;
    offset?: number;
  }): Promise<{ data: Notification[]; hasMore: boolean; filter: NotificationFilter }> {
    let query = `limit=${limit}`;
    if (after) {
      query += `&after=${after}`;
    }
    if (offset) {
      query += `&offset=${offset}`;
    }
    if (tags) {
      query += tags.map((tag) => `&tags[]=${tag}`).join('');
    }
    if (read !== undefined) {
      query += `&read=${read}`;
    }
    if (archived !== undefined) {
      query += `&archived=${archived}`;
    }

    const response = await this.#httpClient.get(`/notifications?${query}`);

    return response;
  }

  async count({ tags, read, archived }: { tags?: Notification['tags']; read?: boolean; archived?: boolean }): Promise<{
    data: {
      count: number;
    };
    filter: NotificationFilter;
  }> {
    let query = '';

    if (tags) {
      query += tags.map((tag) => `&tags[]=${tag}`).join('');
    }
    if (read !== undefined) {
      query += `&read=${read}`;
    }
    if (archived !== undefined) {
      query += `&archived=${archived}`;
    }

    const response = await this.#httpClient.get(`/notifications/count?${query}`);

    return response;
  }

  async read(notificationId: string): Promise<Notification> {
    const response = await this.#httpClient.patch(`/notifications/${notificationId}/mark-as-read`);

    return response;
  }

  async unread(notificationId: string): Promise<Notification> {
    const response = await this.#httpClient.patch(`/notifications/${notificationId}/mark-as-unread`);

    return response;
  }

  async archived(notificationId: string): Promise<Notification> {
    const response = await this.#httpClient.patch(`/notifications/${notificationId}/archived`);

    return response;
  }

  async unarchived(notificationId: string): Promise<Notification> {
    const response = await this.#httpClient.patch(`/notifications/${notificationId}/unarchived`);

    return response;
  }

  async readAll({ tags }: { tags?: Notification['tags'] }): Promise<void> {
    const response = await this.#httpClient.post(`/notifications/mark-all-as-read`, { tags });

    return response;
  }

  async archivedAll({ tags }: { tags?: Notification['tags'] }): Promise<void> {
    const response = await this.#httpClient.post(`/notifications/mark-all-as-archived`, { tags });

    return response;
  }

  async readArchivedAll({ tags }: { tags?: Notification['tags'] }): Promise<void> {
    const response = await this.#httpClient.post(`/notifications/mark-all-as-read-archived`, { tags });

    return response;
  }

  async completeAction({ actionType, notificationId }: { notificationId: string; actionType: ButtonTypeEnum }) {
    const response = await this.#httpClient.patch(`/notifications/${notificationId}/complete`, {
      actionType,
    });

    return response;
  }

  async revertAction({ actionType, notificationId }: { notificationId: string; actionType: ButtonTypeEnum }) {
    const response = await this.#httpClient.patch(`/notifications/${notificationId}/revert`, {
      actionType,
    });

    return response;
  }
}
