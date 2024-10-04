import { ApiOptions, HttpClient } from '@novu/client';
import type {
  ActionTypeEnum,
  ChannelPreference,
  InboxNotification,
  NotificationFilter,
  PreferencesResponse,
  Session,
} from '../types';

export type InboxServiceOptions = ApiOptions;

const NOVU_API_VERSION = '2024-06-26';
const INBOX_ROUTE = '/inbox';
const INBOX_NOTIFICATIONS_ROUTE = `${INBOX_ROUTE}/notifications`;

export class InboxService {
  isSessionInitialized = false;
  #httpClient: HttpClient;

  constructor(options: InboxServiceOptions = {}) {
    this.#httpClient = new HttpClient(options);
    this.#httpClient.updateHeaders({
      'Novu-API-Version': NOVU_API_VERSION,
      'Novu-User-Agent': options.userAgent || '@novu/js',
    });
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

    return this.#httpClient.getFullResponse(`${INBOX_NOTIFICATIONS_ROUTE}?${queryParams.toString()}`);
  }

  count({ filters }: { filters: Array<{ tags?: string[]; read?: boolean; archived?: boolean }> }): Promise<{
    data: Array<{
      count: number;
      filter: NotificationFilter;
    }>;
  }> {
    return this.#httpClient.getFullResponse(`${INBOX_NOTIFICATIONS_ROUTE}/count?filters=${JSON.stringify(filters)}`);
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

  updateGlobalPreferences(channelPreferences: ChannelPreference): Promise<PreferencesResponse> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/preferences`, channelPreferences);
  }

  updateWorkflowPreferences({
    workflowId,
    channelPreferences,
  }: {
    workflowId: string;
    channelPreferences: ChannelPreference;
  }): Promise<PreferencesResponse> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/preferences/${workflowId}`, channelPreferences);
  }
}
