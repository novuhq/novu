import type {
  ChannelConnectionResponse,
  ChannelEndpointResponse,
  CreateChannelEndpointArgs,
  DeleteChannelConnectionArgs,
  DeleteChannelEndpointArgs,
  GenerateChatOAuthUrlArgs,
  GenerateLinkUserOAuthUrlArgs,
  GetChannelConnectionArgs,
  GetChannelEndpointArgs,
  ListChannelConnectionsArgs,
  ListChannelEndpointsArgs,
} from '../channel-connections/types';
import type {
  ArchivedArgs,
  CompleteArgs,
  CountArgs,
  CountResponse,
  DeletedArgs,
  ListNotificationsArgs,
  ListNotificationsResponse,
  Notification,
  ReadArgs,
  RevertArgs,
  SeenArgs,
  SnoozeArgs,
  UnarchivedArgs,
  UnreadArgs,
  UnsnoozeArgs,
} from '../notifications';
import { Preference } from '../preferences/preference';
import { Schedule } from '../preferences/schedule';
import { ListPreferencesArgs, UpdatePreferenceArgs, UpdateScheduleArgs } from '../preferences/types';
import type { InitializeSessionArgs } from '../session';
import type { TopicSubscription } from '../subscriptions/subscription';
import { SubscriptionPreference } from '../subscriptions/subscription-preference';
import type {
  CreateSubscriptionArgs,
  DeleteSubscriptionArgs,
  GetSubscriptionArgs,
  ListSubscriptionsArgs,
  UpdateSubscriptionArgs,
  UpdateSubscriptionPreferenceArgs,
} from '../subscriptions/types';
import type { TagsFilter } from '../types';
import { Session, WebSocketEvent } from '../types';

type NovuPendingEvent<A, D = undefined> = {
  args: A;
  data?: D;
};
type NovuResolvedEvent<A, D> = NovuPendingEvent<A, D> & {
  error?: unknown;
};
// two possible status of the event: pending, resolved
type EventName<T extends string> = `${T}.pending` | `${T}.resolved`;
// infer the "status" of the event based on the string `module.action.status`
type EventStatus<T extends string> = `${T extends `${infer _}.${infer __}.${infer V}` ? V : never}`;
// based on the key it returns the event pending, success or error object
type EventObject<K extends string, ARGS, DATA, EVENT_STATUS = EventStatus<K>> = EVENT_STATUS extends 'pending'
  ? NovuPendingEvent<ARGS, DATA>
  : NovuResolvedEvent<ARGS, DATA>;

type BaseEvents<T extends string, ARGS, DATA> = {
  [key in `${EventName<T>}`]: EventObject<key, ARGS, DATA>;
};

type SessionInitializeEvents = BaseEvents<'session.initialize', InitializeSessionArgs, Session>;
type NotificationsFetchEvents = BaseEvents<'notifications.list', ListNotificationsArgs, ListNotificationsResponse>;
type NotificationsFetchCountEvents = BaseEvents<'notifications.count', CountArgs, CountResponse>;
type NotificationReadEvents = BaseEvents<'notification.read', ReadArgs, Notification>;
type NotificationUnreadEvents = BaseEvents<'notification.unread', UnreadArgs, Notification>;
type NotificationSeenEvents = BaseEvents<'notification.seen', SeenArgs, Notification>;
type NotificationArchiveEvents = BaseEvents<'notification.archive', ArchivedArgs, Notification>;
type NotificationUnarchiveEvents = BaseEvents<'notification.unarchive', UnarchivedArgs, Notification>;
type NotificationDeleteEvents = BaseEvents<'notification.delete', DeletedArgs, Notification>;
type NotificationSnoozeEvents = BaseEvents<'notification.snooze', SnoozeArgs, Notification>;
type NotificationUnsnoozeEvents = BaseEvents<'notification.unsnooze', UnsnoozeArgs, Notification>;
type NotificationCompleteActionEvents = BaseEvents<'notification.complete_action', CompleteArgs, Notification>;
type NotificationRevertActionEvents = BaseEvents<'notification.revert_action', RevertArgs, Notification>;
type NotificationsReadAllEvents = BaseEvents<
  'notifications.read_all',
  { tags?: TagsFilter; data?: Record<string, unknown> },
  Notification[]
>;
type NotificationsSeenAllEvents = BaseEvents<
  'notifications.seen_all',
  { notificationIds: string[] } | { tags?: TagsFilter; data?: Record<string, unknown> } | {},
  Notification[]
>;
type NotificationsArchivedAllEvents = BaseEvents<
  'notifications.archive_all',
  { tags?: TagsFilter; data?: Record<string, unknown> },
  Notification[]
>;
type NotificationsReadArchivedAllEvents = BaseEvents<
  'notifications.archive_all_read',
  { tags?: TagsFilter; data?: Record<string, unknown> },
  Notification[]
>;
type NotificationsDeletedAllEvents = BaseEvents<
  'notifications.delete_all',
  { tags?: TagsFilter; data?: Record<string, unknown> },
  Notification[]
>;
type PreferencesFetchEvents = BaseEvents<'preferences.list', ListPreferencesArgs, Preference[]>;
type PreferenceUpdateEvents = BaseEvents<'preference.update', UpdatePreferenceArgs, Preference>;
type PreferencesBulkUpdateEvents = BaseEvents<'preferences.bulk_update', Array<UpdatePreferenceArgs>, Preference[]>;
type PreferenceScheduleGetEvents = BaseEvents<'preference.schedule.get', undefined, Schedule>;
type PreferenceScheduleUpdateEvents = BaseEvents<'preference.schedule.update', UpdateScheduleArgs, Schedule>;
type SubscriptionsFetchEvents = BaseEvents<'subscriptions.list', ListSubscriptionsArgs, TopicSubscription[]>;
type SubscriptionGetEvents = BaseEvents<'subscription.get', GetSubscriptionArgs, TopicSubscription | null>;
type SubscriptionCreateEvents = BaseEvents<'subscription.create', CreateSubscriptionArgs, TopicSubscription>;
type SubscriptionUpdateEvents = BaseEvents<'subscription.update', UpdateSubscriptionArgs, TopicSubscription>;
type SubscriptionPreferenceUpdateEvents = BaseEvents<
  'subscription.preference.update',
  UpdateSubscriptionPreferenceArgs,
  SubscriptionPreference
>;
type SubscriptionPreferencesBulkUpdateEvents = BaseEvents<
  'subscription.preferences.bulk_update',
  Array<UpdateSubscriptionPreferenceArgs & { subscriptionId: string }>,
  SubscriptionPreference[]
>;
type SubscriptionDeleteEvents = BaseEvents<'subscription.delete', DeleteSubscriptionArgs, void>;

type ChannelConnectionOAuthUrlEvents = BaseEvents<
  'channel-connection.oauth-url',
  GenerateChatOAuthUrlArgs,
  { url: string }
>;
type ChannelConnectionsFetchEvents = BaseEvents<
  'channel-connections.list',
  ListChannelConnectionsArgs,
  ChannelConnectionResponse[]
>;
type ChannelConnectionGetEvents = BaseEvents<
  'channel-connection.get',
  GetChannelConnectionArgs,
  ChannelConnectionResponse | null
>;
type ChannelConnectionDeleteEvents = BaseEvents<'channel-connection.delete', DeleteChannelConnectionArgs, void>;

type ChannelEndpointOAuthUrlEvents = BaseEvents<
  'channel-endpoint.oauth-url',
  GenerateLinkUserOAuthUrlArgs,
  { url: string }
>;
type ChannelEndpointsFetchEvents = BaseEvents<
  'channel-endpoints.list',
  ListChannelEndpointsArgs,
  ChannelEndpointResponse[]
>;
type ChannelEndpointGetEvents = BaseEvents<
  'channel-endpoint.get',
  GetChannelEndpointArgs,
  ChannelEndpointResponse | null
>;
type ChannelEndpointCreateEvents = BaseEvents<
  'channel-endpoint.create',
  CreateChannelEndpointArgs,
  ChannelEndpointResponse
>;
type ChannelEndpointDeleteEvents = BaseEvents<'channel-endpoint.delete', DeleteChannelEndpointArgs, void>;

type SocketConnectEvents = BaseEvents<'socket.connect', { socketUrl: string }, undefined>;
export type NotificationReceivedEvent = `notifications.${WebSocketEvent.RECEIVED}`;
export type NotificationUnseenEvent = `notifications.${WebSocketEvent.UNSEEN}`;
export type NotificationUnreadEvent = `notifications.${WebSocketEvent.UNREAD}`;
type SocketEvents = {
  [key in NotificationReceivedEvent]: { result: Notification };
} & {
  [key in NotificationUnseenEvent]: { result: number };
} & {
  [key in NotificationUnreadEvent]: { result: { total: number; severity: Record<string, number> } };
};

/**
 * Events that are emitted by Novu Event Emitter.
 *
 * The event name consists of second pattern: module.action.status
 * - module: the name of the module
 * - action: the action that is being performed
 * - status: the status of the action, could be pending or resolved
 *
 * Each event has a corresponding payload that is associated with the event:
 * - pending: the args that are passed to the action and the optional optimistic value
 * - resolved: the args that are passed to the action and the result of the action or the error that is thrown
 */
export type Events = SessionInitializeEvents &
  NotificationsFetchEvents & {
    'notifications.list.updated': { data: ListNotificationsResponse };
  } & NotificationsFetchCountEvents &
  PreferencesFetchEvents & {
    'preferences.list.updated': { data: Preference[] };
  } & PreferenceUpdateEvents &
  PreferencesBulkUpdateEvents &
  PreferenceScheduleGetEvents &
  PreferenceScheduleUpdateEvents & {
    'preference.schedule.get.updated': { data: Schedule };
  } & SubscriptionsFetchEvents &
  SubscriptionGetEvents &
  SubscriptionCreateEvents &
  SubscriptionPreferenceUpdateEvents &
  SubscriptionUpdateEvents &
  SubscriptionPreferencesBulkUpdateEvents &
  SubscriptionDeleteEvents & {
    'subscriptions.list.updated': { data: { topicKey: string; subscriptions: TopicSubscription[] } };
  } & ChannelConnectionOAuthUrlEvents &
  ChannelConnectionsFetchEvents &
  ChannelConnectionGetEvents &
  ChannelConnectionDeleteEvents &
  ChannelEndpointOAuthUrlEvents &
  ChannelEndpointsFetchEvents &
  ChannelEndpointGetEvents &
  ChannelEndpointCreateEvents &
  ChannelEndpointDeleteEvents &
  SocketConnectEvents &
  SocketEvents &
  NotificationReadEvents &
  NotificationUnreadEvents &
  NotificationSeenEvents &
  NotificationArchiveEvents &
  NotificationUnarchiveEvents &
  NotificationDeleteEvents &
  NotificationSnoozeEvents &
  NotificationUnsnoozeEvents &
  NotificationCompleteActionEvents &
  NotificationRevertActionEvents &
  NotificationsReadAllEvents &
  NotificationsSeenAllEvents &
  NotificationsArchivedAllEvents &
  NotificationsReadArchivedAllEvents &
  NotificationsDeletedAllEvents;

export type EventNames = keyof Events;
export type SocketEventNames = keyof SocketEvents;
export type NotificationEvents = keyof (NotificationReadEvents &
  NotificationUnreadEvents &
  NotificationSeenEvents &
  NotificationArchiveEvents &
  NotificationUnarchiveEvents &
  NotificationDeleteEvents &
  NotificationSnoozeEvents &
  NotificationUnsnoozeEvents &
  NotificationCompleteActionEvents &
  NotificationRevertActionEvents &
  NotificationsReadAllEvents &
  NotificationsSeenAllEvents &
  NotificationsArchivedAllEvents &
  NotificationsReadArchivedAllEvents &
  NotificationsDeletedAllEvents);
export type PreferenceEvents = keyof (PreferenceUpdateEvents & PreferencesBulkUpdateEvents);
export type PreferenceScheduleEvents = keyof (PreferenceScheduleGetEvents & PreferenceScheduleUpdateEvents);
export type SubscriptionEvents = keyof (SubscriptionsFetchEvents &
  SubscriptionGetEvents &
  SubscriptionCreateEvents &
  SubscriptionPreferenceUpdateEvents &
  SubscriptionUpdateEvents &
  SubscriptionPreferencesBulkUpdateEvents &
  SubscriptionDeleteEvents);

export type EventHandler<T = unknown> = (event: T) => void;
