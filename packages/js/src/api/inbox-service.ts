import type {
  ActionTypeEnum,
  ChannelPreference,
  DefaultSchedule,
  InboxNotification,
  NotificationFilter,
  PreferencesResponse,
  Session,
  SeverityLevelEnum,
  Subscriber,
  WeeklySchedule,
  WorkflowCriticalityEnum,
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
    defaultSchedule,
  }: {
    applicationIdentifier?: string;
    subscriberHash?: string;
    subscriber?: Subscriber;
    defaultSchedule?: DefaultSchedule;
  }): Promise<Session> {
    const response = (await this.#httpClient.post(`${INBOX_ROUTE}/session`, {
      applicationIdentifier,
      subscriberHash,
      subscriber,
      defaultSchedule,
    })) as Session;
    this.#httpClient.setAuthorizationToken(response.token);
    this.#httpClient.setKeylessHeader(response.applicationIdentifier);
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
    seen,
    data,
    severity,
  }: {
    tags?: string[];
    read?: boolean;
    archived?: boolean;
    snoozed?: boolean;
    seen?: boolean;
    limit?: number;
    after?: string;
    offset?: number;
    data?: Record<string, unknown>;
    severity?: SeverityLevelEnum | SeverityLevelEnum[];
  }): Promise<{ data: InboxNotification[]; hasMore: boolean; filter: NotificationFilter }> {
    const searchParams = new URLSearchParams(`limit=${limit}`);
    if (after) {
      searchParams.append('after', after);
    }
    if (offset) {
      searchParams.append('offset', `${offset}`);
    }
    if (tags) {
      for (const tag of tags) {
        searchParams.append('tags[]', tag);
      }
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
    if (seen !== undefined) {
      searchParams.append('seen', `${seen}`);
    }
    if (data !== undefined) {
      searchParams.append('data', JSON.stringify(data));
    }
    if (severity && Array.isArray(severity)) {
      for (const el of severity) {
        searchParams.append('severity[]', el);
      }
    } else if (severity) {
      searchParams.append('severity', severity);
    }

    return this.#httpClient.get(INBOX_NOTIFICATIONS_ROUTE, searchParams, false);
  }

  count({
    filters,
  }: {
    filters: Array<{
      tags?: string[];
      read?: boolean;
      archived?: boolean;
      snoozed?: boolean;
      seen?: boolean;
      data?: Record<string, unknown>;
      severity?: SeverityLevelEnum | SeverityLevelEnum[];
    }>;
  }): Promise<{
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

  readAll({ tags, data }: { tags?: string[]; data?: Record<string, unknown> }): Promise<void> {
    return this.#httpClient.post(`${INBOX_NOTIFICATIONS_ROUTE}/read`, {
      tags,
      data: data ? JSON.stringify(data) : undefined,
    });
  }

  archiveAll({ tags, data }: { tags?: string[]; data?: Record<string, unknown> }): Promise<void> {
    return this.#httpClient.post(`${INBOX_NOTIFICATIONS_ROUTE}/archive`, {
      tags,
      data: data ? JSON.stringify(data) : undefined,
    });
  }

  archiveAllRead({ tags, data }: { tags?: string[]; data?: Record<string, unknown> }): Promise<void> {
    return this.#httpClient.post(`${INBOX_NOTIFICATIONS_ROUTE}/read-archive`, {
      tags,
      data: data ? JSON.stringify(data) : undefined,
    });
  }

  delete(notificationId: string): Promise<void> {
    return this.#httpClient.delete(`${INBOX_NOTIFICATIONS_ROUTE}/${notificationId}/delete`);
  }

  deleteAll({ tags, data }: { tags?: string[]; data?: Record<string, unknown> }): Promise<void> {
    return this.#httpClient.post(`${INBOX_NOTIFICATIONS_ROUTE}/delete`, {
      tags,
      data: data ? JSON.stringify(data) : undefined,
    });
  }

  markAsSeen({
    notificationIds,
    tags,
    data,
  }: {
    notificationIds?: string[];
    tags?: string[];
    data?: Record<string, unknown>;
  }): Promise<void> {
    return this.#httpClient.post(`${INBOX_NOTIFICATIONS_ROUTE}/seen`, {
      notificationIds,
      tags,
      data: data ? JSON.stringify(data) : undefined,
    });
  }

  seen(notificationId: string): Promise<void> {
    return this.markAsSeen({ notificationIds: [notificationId] });
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

  fetchPreferences({
    tags,
    severity,
    criticality,
  }: {
    tags?: string[];
    severity?: SeverityLevelEnum | SeverityLevelEnum[];
    criticality: WorkflowCriticalityEnum;
  }): Promise<PreferencesResponse[]> {
    const queryParams = new URLSearchParams();
    if (tags) {
      for (const tag of tags) {
        queryParams.append('tags[]', tag);
      }
    }
    if (severity && Array.isArray(severity)) {
      for (const el of severity) {
        queryParams.append('severity[]', el);
      }
    } else if (severity) {
      queryParams.append('severity', severity);
    }
    if (criticality) {
      queryParams.append('criticality', criticality);
    }

    const query = queryParams.size ? `?${queryParams.toString()}` : '';

    return this.#httpClient.get(`${INBOX_ROUTE}/preferences${query}`);
  }

  bulkUpdatePreferences(
    preferences: Array<
      {
        workflowId: string;
      } & ChannelPreference
    >
  ): Promise<PreferencesResponse[]> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/preferences/bulk`, { preferences });
  }

  updateGlobalPreferences(
    preferences: ChannelPreference & {
      schedule?: {
        isEnabled?: boolean;
        weeklySchedule?: WeeklySchedule;
      };
    }
  ): Promise<PreferencesResponse> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/preferences`, preferences);
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

  fetchGlobalPreferences(): Promise<PreferencesResponse> {
    return this.#httpClient.get(`${INBOX_ROUTE}/preferences/global`);
  }

  triggerHelloWorldEvent(): Promise<unknown> {
    const payload = {
      name: 'hello-world',
      to: {
        subscriberId: 'keyless-subscriber-id',
      },
      payload: {
        subject: 'Novu Keyless Environment',
        body: "You're using a keyless demo environment. For full access to Novu features and cloud integration, obtain your API key.",
        primaryActionText: 'Obtain API Key',
        primaryActionUrl: 'https://go.novu.co/keyless',
        secondaryActionText: 'Explore Documentation',
        secondaryActionUrl: 'https://go.novu.co/keyless-docs',
      },
    };

    return this.#httpClient.post('/inbox/events', payload);
  }
}
