import type { RulesLogic } from 'json-logic-js';
import type { PreferenceFilter } from '../subscriptions/types';
import type {
  ActionTypeEnum,
  ChannelPreference,
  Context,
  DefaultSchedule,
  InboxNotification,
  NotificationFilter,
  PreferencesResponse,
  Session,
  Subscriber,
  SubscriptionPreferenceResponse,
  SubscriptionResponse,
  TagsFilter,
  WeeklySchedule,
  WorkflowCriticalityEnum,
} from '../types';
import { SeverityLevelEnum } from '../types';
import { HttpClient, HttpClientOptions } from './http-client';

export type InboxServiceOptions = HttpClientOptions;

const INBOX_ROUTE = '/inbox';
const INBOX_NOTIFICATIONS_ROUTE = `${INBOX_ROUTE}/notifications`;

function appendTagsToSearchParams(searchParams: URLSearchParams, tags: TagsFilter | undefined): void {
  if (tags === undefined) {
    return;
  }

  if (Array.isArray(tags)) {
    if (tags.length === 0) {
      return;
    }

    for (const tag of tags) {
      searchParams.append('tags[]', tag);
    }

    return;
  }

  if ('or' in tags) {
    if (tags.or.length === 0) {
      return;
    }

    for (const tag of tags.or) {
      searchParams.append('tags[]', tag);
    }

    return;
  }

  if ('and' in tags) {
    if (tags.and.length === 0) {
      return;
    }

    tags.and.forEach((group, groupIndex) => {
      for (const tag of group.or) {
        searchParams.append(`tags[${groupIndex}][]`, tag);
      }
    });
  }
}

export class InboxService {
  isSessionInitialized = false;
  #httpClient: HttpClient;

  constructor(options: InboxServiceOptions = {}) {
    this.#httpClient = new HttpClient(options);
  }

  async initializeSession({
    applicationIdentifier,
    subscriberHash,
    contextHash,
    subscriber,
    defaultSchedule,
    context,
  }: {
    applicationIdentifier?: string;
    subscriberHash?: string;
    contextHash?: string;
    subscriber?: Subscriber;
    defaultSchedule?: DefaultSchedule;
    context?: Context;
  }): Promise<Session> {
    const response = (await this.#httpClient.post(`${INBOX_ROUTE}/session`, {
      applicationIdentifier,
      subscriberHash,
      contextHash,
      subscriber,
      defaultSchedule,
      context,
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
    createdGte,
    createdLte,
  }: {
    tags?: TagsFilter;
    read?: boolean;
    archived?: boolean;
    snoozed?: boolean;
    seen?: boolean;
    limit?: number;
    after?: string;
    offset?: number;
    data?: Record<string, unknown>;
    severity?: SeverityLevelEnum | SeverityLevelEnum[];
    createdGte?: number;
    createdLte?: number;
  }): Promise<{ data: InboxNotification[]; hasMore: boolean; filter: NotificationFilter }> {
    const searchParams = new URLSearchParams(`limit=${limit}`);
    if (after) {
      searchParams.append('after', after);
    }
    if (offset) {
      searchParams.append('offset', `${offset}`);
    }
    appendTagsToSearchParams(searchParams, tags);
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
    if (createdGte) {
      searchParams.append('createdGte', `${createdGte}`);
    }
    if (createdLte) {
      searchParams.append('createdLte', `${createdLte}`);
    }

    return this.#httpClient.get(INBOX_NOTIFICATIONS_ROUTE, searchParams, false);
  }

  count({
    filters,
  }: {
    filters: Array<{
      tags?: TagsFilter;
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

  readAll({ tags, data }: { tags?: TagsFilter; data?: Record<string, unknown> }): Promise<void> {
    return this.#httpClient.post(`${INBOX_NOTIFICATIONS_ROUTE}/read`, {
      tags,
      data: data ? JSON.stringify(data) : undefined,
    });
  }

  archiveAll({ tags, data }: { tags?: TagsFilter; data?: Record<string, unknown> }): Promise<void> {
    return this.#httpClient.post(`${INBOX_NOTIFICATIONS_ROUTE}/archive`, {
      tags,
      data: data ? JSON.stringify(data) : undefined,
    });
  }

  archiveAllRead({ tags, data }: { tags?: TagsFilter; data?: Record<string, unknown> }): Promise<void> {
    return this.#httpClient.post(`${INBOX_NOTIFICATIONS_ROUTE}/read-archive`, {
      tags,
      data: data ? JSON.stringify(data) : undefined,
    });
  }

  delete(notificationId: string): Promise<void> {
    return this.#httpClient.delete(`${INBOX_NOTIFICATIONS_ROUTE}/${notificationId}/delete`);
  }

  deleteAll({ tags, data }: { tags?: TagsFilter; data?: Record<string, unknown> }): Promise<void> {
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
    tags?: TagsFilter;
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

  fetchSubscriptions(topicKey: string): Promise<SubscriptionResponse[]> {
    return this.#httpClient.get(`${INBOX_ROUTE}/topics/${topicKey}/subscriptions`);
  }

  getSubscription(
    topicKey: string,
    identifier?: string,
    workflowIds?: string[],
    tags?: string[]
  ): Promise<SubscriptionResponse | undefined> {
    const searchParams = new URLSearchParams();

    if (workflowIds?.length)
      for (const workflowIdentifier of workflowIds) searchParams.append('workflowIds', workflowIdentifier);

    if (tags?.length) for (const tag of tags) searchParams.append('tags', tag);

    const query = searchParams.size ? `?${searchParams.toString()}` : '';

    return this.#httpClient.get(`${INBOX_ROUTE}/topics/${topicKey}/subscriptions/${identifier}${query}`);
  }

  createSubscription({
    identifier,
    name,
    topicKey,
    topicName,
    preferences,
  }: {
    identifier?: string;
    name?: string;
    topicKey: string;
    topicName?: string;
    preferences?: Array<PreferenceFilter>;
  }): Promise<SubscriptionResponse> {
    return this.#httpClient.post(`${INBOX_ROUTE}/topics/${topicKey}/subscriptions`, {
      identifier,
      name,
      ...(topicName && { topic: { name: topicName } }),
      ...(preferences !== undefined && { preferences }),
    });
  }

  updateSubscription({
    topicKey,
    identifier,
    name,
    preferences,
  }: {
    topicKey: string;
    identifier: string;
    name?: string;
    preferences?: Array<PreferenceFilter>;
  }): Promise<SubscriptionResponse> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/topics/${topicKey}/subscriptions/${identifier}`, {
      name,
      ...(preferences !== undefined && { preferences }),
    });
  }

  updateSubscriptionPreference({
    subscriptionIdentifier,
    workflowId,
    enabled,
    condition,
    email,
    sms,
    in_app,
    chat,
    push,
  }: {
    subscriptionIdentifier: string;
    workflowId: string;
    enabled?: boolean;
    condition?: RulesLogic;
    email?: boolean;
    sms?: boolean;
    in_app?: boolean;
    chat?: boolean;
    push?: boolean;
  }): Promise<SubscriptionPreferenceResponse> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/subscriptions/${subscriptionIdentifier}/preferences/${workflowId}`, {
      enabled,
      condition,
      email,
      sms,
      in_app,
      chat,
      push,
    });
  }

  bulkUpdateSubscriptionPreferences(
    preferences: Array<{
      subscriptionIdentifier: string;
      workflowId: string;
      enabled?: boolean;
      condition?: RulesLogic;
      email?: boolean;
      sms?: boolean;
      in_app?: boolean;
      chat?: boolean;
      push?: boolean;
    }>
  ): Promise<SubscriptionPreferenceResponse[]> {
    return this.#httpClient.patch(`${INBOX_ROUTE}/preferences/bulk`, { preferences });
  }

  deleteSubscription({ topicKey, identifier }: { topicKey: string; identifier: string }): Promise<void> {
    return this.#httpClient.delete(`${INBOX_ROUTE}/topics/${topicKey}/subscriptions/${identifier}`);
  }
}
