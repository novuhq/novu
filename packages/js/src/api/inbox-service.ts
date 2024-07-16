import { ApiOptions, HttpClient } from '@novu/client';
import type { ActionTypeEnum, InboxNotification, NotificationFilter, Session } from '../types';

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

  fetchNotifications({
    after,
    archived,
    limit = 10,
    offset,
    read,
    tags,
  }: {
    tags?: string[];
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

    return this.#httpClient.getFullResponse(`${INBOX_ROUTE}/notifications?${queryParams.toString()}`);
  }

  count({ tags, read, archived }: { tags?: string[]; read?: boolean; archived?: boolean }): Promise<{
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

    return this.#httpClient.getFullResponse(`${INBOX_ROUTE}/notifications/count?${queryParams.toString()}`);
  }

  read(notificationId: string): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/notifications/${notificationId}/read`);
  }

  unread(notificationId: string): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/notifications/${notificationId}/unread`);
  }

  archive(notificationId: string): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/notifications/${notificationId}/archive`);
  }

  unarchive(notificationId: string): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/notifications/${notificationId}/unarchive`);
  }

  readAll({ tags }: { tags?: string[] }): Promise<void> {
    return this.#httpClient.post(`${INBOX_ROUTE}/notifications/read`, { tags });
  }

  archiveAll({ tags }: { tags?: string[] }): Promise<void> {
    return this.#httpClient.post(`${INBOX_ROUTE}/notifications/archive`, { tags });
  }

  archiveAllRead({ tags }: { tags?: string[] }): Promise<void> {
    return this.#httpClient.post(`${INBOX_ROUTE}/notifications/read-archive`, { tags });
  }

  completeAction({
    actionType,
    notificationId,
  }: {
    notificationId: string;
    actionType: ActionTypeEnum;
  }): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/notifications/${notificationId}/complete`, {
      actionType,
    });
  }

  revertAction({
    actionType,
    notificationId,
  }: {
    notificationId: string;
    actionType: ActionTypeEnum;
  }): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/notifications/${notificationId}/revert`, {
      actionType,
    });
  }
}
