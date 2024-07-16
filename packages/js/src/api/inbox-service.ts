import { ApiOptions, HttpClient } from '@novu/client';
import type { Session } from '../types';
import type { ButtonTypeEnum, InboxNotification, NotificationFilter } from './types';

export type InboxServiceOptions = ApiOptions;

const INBOX_ROUTE = '/inbox';

export class InboxService {
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
    const response = (await this.#httpClient.post(`${INBOX_ROUTE}/session`, {
      applicationIdentifier,
      subscriberId,
      subscriberHash,
    })) as Session;
    this.#httpClient.setAuthorizationToken(response.token);

    return response;
  }

  async fetchNotifications({
    after,
    archived,
    limit = 10,
    offset,
    read,
    tags,
  }: {
    tags?: InboxNotification['tags'];
    read?: boolean;
    archived?: boolean;
    limit?: number;
    after?: string;
    offset?: number;
  }): Promise<{ data: InboxNotification[]; hasMore: boolean; filter: NotificationFilter }> {
    const queryParams = new URLSearchParams(`limit=${limit}`);
    if (after) {
      queryParams.append('after', after);
    }
    if (offset) {
      queryParams.append('offset', `${offset}`);
    }
    if (tags) {
      tags.forEach((tag) => queryParams.append('tags[]', tag));
    }
    if (read !== undefined) {
      queryParams.append('read', `${read}`);
    }
    if (archived !== undefined) {
      queryParams.append('archived', `${archived}`);
    }

    const data = await this.#httpClient.get(`${INBOX_ROUTE}/notifications?${queryParams.toString()}`);

    // TODO: fix this
    return {
      data,
      hasMore: false,
      filter: {},
    };
  }

  async count({
    tags,
    read,
    archived,
  }: {
    tags?: InboxNotification['tags'];
    read?: boolean;
    archived?: boolean;
  }): Promise<{
    data: {
      count: number;
    };
    filter: NotificationFilter;
  }> {
    const queryParams = new URLSearchParams();

    if (tags) {
      tags.forEach((tag) => queryParams.append('tags[]', tag));
    }
    if (read !== undefined) {
      queryParams.append('read', `${read}`);
    }
    if (archived !== undefined) {
      queryParams.append('archived', `${archived}`);
    }

    return await this.#httpClient.get(`${INBOX_ROUTE}/notifications/count?${queryParams.toString()}`);
  }

  async read(notificationId: string): Promise<InboxNotification> {
    const response = await this.#httpClient.patch(`${INBOX_ROUTE}/notifications/${notificationId}/read`);

    return response;
  }

  async unread(notificationId: string): Promise<InboxNotification> {
    const response = await this.#httpClient.patch(`${INBOX_ROUTE}/notifications/${notificationId}/unread`);

    return response;
  }

  async archived(notificationId: string): Promise<InboxNotification> {
    const response = await this.#httpClient.patch(`${INBOX_ROUTE}/notifications/${notificationId}/archive`);

    return response;
  }

  async unarchived(notificationId: string): Promise<InboxNotification> {
    const response = await this.#httpClient.patch(`${INBOX_ROUTE}/notifications/${notificationId}/unarchive`);

    return response;
  }

  async readAll({ tags }: { tags?: InboxNotification['tags'] }): Promise<void> {
    const response = await this.#httpClient.post(`${INBOX_ROUTE}/notifications/read`, { tags });

    return response;
  }

  async archivedAll({ tags }: { tags?: InboxNotification['tags'] }): Promise<void> {
    const response = await this.#httpClient.post(`${INBOX_ROUTE}/notifications/archive`, { tags });

    return response;
  }

  async readArchivedAll({ tags }: { tags?: InboxNotification['tags'] }): Promise<void> {
    const response = await this.#httpClient.post(`${INBOX_ROUTE}/notifications/read-archive`, { tags });

    return response;
  }

  async completeAction({ actionType, notificationId }: { notificationId: string; actionType: ButtonTypeEnum }) {
    const response = await this.#httpClient.patch(`${INBOX_ROUTE}/notifications/${notificationId}/complete`, {
      actionType,
    });

    return response;
  }

  async revertAction({ actionType, notificationId }: { notificationId: string; actionType: ButtonTypeEnum }) {
    const response = await this.#httpClient.patch(`${INBOX_ROUTE}/notifications/${notificationId}/revert`, {
      actionType,
    });

    return response;
  }
}
