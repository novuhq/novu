import type {
  ActionTypeEnum,
  ChannelPreference,
  InboxNotification,
  NotificationFilter,
  PreferencesResponse,
  Session,
  Subscriber,
} from '../types';
import { HttpClient, HttpClientOptions } from './http-client';

export type InboxServiceOptions = HttpClientOptions;

const INBOX_ROUTE = '/inbox';
const INBOX_NOTIFICATIONS_ROUTE = `${INBOX_ROUTE}/notifications`;

export class InboxService {
  isSessionInitialized = false;
  #httpClient: HttpClient;

  constructor(options: InboxServiceOptions = {}) {
    this.#httpClient = new HttpClient(options);
  }

  async initializeSession({
    applicationIdentifier,
    subscriberHash,
    subscriber,
  }: {
    applicationIdentifier: string;
    subscriberHash?: string;
    subscriber: Subscriber;
  }): Promise<Session> {
    const response = (await this.#httpClient.post(`${INBOX_ROUTE}/session`, {
      applicationIdentifier,
      subscriberHash,
      subscriber,
    })) as Session;
    this.#httpClient.setAuthorizationToken(response.token);
    this.isSessionInitialized = true;

    return response;
  }

  fetchNotifications({
    after,
    archived,
    limit = 10,
    offset,
    read,
    tags,
    snoozed,
  }: {
    tags?: string[];
    read?: boolean;
    archived?: boolean;
    snoozed?: boolean;
    limit?: number;
    after?: string;
    offset?: number;
  }): Promise<{ data: InboxNotification[]; hasMore: boolean; filter: NotificationFilter }> {
    const searchParams = new URLSearchParams(`limit=${limit}`);
    if (after) {
      searchParams.append('after', after);
    }
    if (offset) {
      searchParams.append('offset', `${offset}`);
    }
    if (tags) {
      tags.forEach((tag) => searchParams.append('tags[]', tag));
    }
    if (read !== undefined) {
      searchParams.append('read', `${read}`);
    }
    if (archived !== undefined) {
      searchParams.append('archived', `${archived}`);
    }
    if (snoozed !== undefined) {
      searchParams.append('snoozed', `${snoozed}`);
    }

    return this.#httpClient.get(INBOX_NOTIFICATIONS_ROUTE, searchParams, false);
  }

  count({ filters }: { filters: Array<{ tags?: string[]; read?: boolean; archived?: boolean }> }): Promise<{
    data: Array<{
      count: number;
      filter: NotificationFilter;
    }>;
  }> {
    return this.#httpClient.get(
      `${INBOX_NOTIFICATIONS_ROUTE}/count`,
      new URLSearchParams({
        filters: JSON.stringify(filters),
      }),
      false
    );
  }

  read(notificationId: string): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_NOTIFICATIONS_ROUTE}/${notificationId}/read`);
  }

  unread(notificationId: string): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_NOTIFICATIONS_ROUTE}/${notificationId}/unread`);
  }

  archive(notificationId: string): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_NOTIFICATIONS_ROUTE}/${notificationId}/archive`);
  }

  unarchive(notificationId: string): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_NOTIFICATIONS_ROUTE}/${notificationId}/unarchive`);
  }

  snooze(notificationId: string, snoozeUntil: string): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_NOTIFICATIONS_ROUTE}/${notificationId}/snooze`, { snoozeUntil });
  }

  unsnooze(notificationId: string): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_NOTIFICATIONS_ROUTE}/${notificationId}/unsnooze`);
  }

  readAll({ tags }: { tags?: string[] }): Promise<void> {
    return this.#httpClient.post(`${INBOX_NOTIFICATIONS_ROUTE}/read`, { tags });
  }

  archiveAll({ tags }: { tags?: string[] }): Promise<void> {
    return this.#httpClient.post(`${INBOX_NOTIFICATIONS_ROUTE}/archive`, { tags });
  }

  archiveAllRead({ tags }: { tags?: string[] }): Promise<void> {
    return this.#httpClient.post(`${INBOX_NOTIFICATIONS_ROUTE}/read-archive`, { tags });
  }

  completeAction({
    actionType,
    notificationId,
  }: {
    notificationId: string;
    actionType: ActionTypeEnum;
  }): Promise<InboxNotification> {
    return this.#httpClient.patch(`${INBOX_NOTIFICATIONS_ROUTE}/${notificationId}/complete`, {
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
    return this.#httpClient.patch(`${INBOX_NOTIFICATIONS_ROUTE}/${notificationId}/revert`, {
      actionType,
    });
  }

  fetchPreferences(tags?: string[]): Promise<PreferencesResponse[]> {
    const queryParams = new URLSearchParams();
    if (tags) {
      tags.forEach((tag) => queryParams.append('tags[]', tag));
    }

    const query = queryParams.size ? `?${queryParams.toString()}` : '';

    return this.#httpClient.get(`${INBOX_ROUTE}/preferences${query}`);
  }

  updateGlobalPreferences(channels: ChannelPreference): Promise<PreferencesResponse> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/preferences`, channels);
  }

  updateWorkflowPreferences({
    workflowId,
    channels,
  }: {
    workflowId: string;
    channels: ChannelPreference;
  }): Promise<PreferencesResponse> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/preferences/${workflowId}`, channels);
  }
}
