import type {
  FetchCountArgs,
  FetchFeedArgs,
  MarkNotificationAsArgs,
  MarkAllNotificationsAsArgs,
  MarkNotificationsAsArgs,
  MarkNotificationActionAsArgs,
  Notification,
  RemoveNotificationArgs,
  RemoveAllNotificationsArgs,
  RemoveNotificationsArgs,
} from '../feeds';
import { Preference } from '../preferences/preference';
import { FetchPreferencesArgs, UpdatePreferencesArgs } from '../preferences/types';
import type { InitializeSessionArgs } from '../session';
import { PaginatedResponse, Session, WebSocketEvent } from '../types';

type NovuPendingEvent<A, O = undefined> = {
  args: A;
  optimistic?: O;
};
type NovuSuccessEvent<A, R> = Pick<NovuPendingEvent<A>, 'args'> & {
  result: R;
};
type NovuErrorEvent<A, F = undefined> = Pick<NovuPendingEvent<A>, 'args'> & {
  error: unknown;
  fallback?: F;
};
// three possible status of the event: pending, success, error
type EventName<T extends string> = `${T}.pending` | `${T}.success` | `${T}.error`;
// infer the "status" of the event based on the string `module.action.status`
type EventStatus<T extends string> = `${T extends `${infer _}.${infer __}.${infer V}` ? V : never}`;
// based on the key it returns the event pending, success or error object
type EventObject<
  K extends string,
  ARGS,
  RESULT,
  OPTIMISTIC = undefined,
  FALLBACK = undefined,
  EVENT_STATUS = EventStatus<K>
> = EVENT_STATUS extends 'pending'
  ? NovuPendingEvent<ARGS, OPTIMISTIC>
  : EVENT_STATUS extends 'success'
  ? NovuSuccessEvent<ARGS, RESULT>
  : NovuErrorEvent<ARGS, FALLBACK>;

type BaseEvents<T extends string, ARGS, RESULT, OPTIMISTIC = undefined, FALLBACK = undefined> = {
  [key in `${EventName<T>}`]: EventObject<key, ARGS, RESULT, OPTIMISTIC, FALLBACK>;
};

type SessionInitializeEvents = BaseEvents<'session.initialize', InitializeSessionArgs, Session>;
type FeedFetchEvents = BaseEvents<'feeds.fetch', FetchFeedArgs, PaginatedResponse<Notification>>;
type FeedFetchCountEvents = BaseEvents<'feeds.fetch_count', FetchCountArgs, number>;
type FeedMarkNotificationsAsEvents = BaseEvents<
  'feeds.mark_notifications_as',
  MarkNotificationsAsArgs,
  Notification[],
  Notification[],
  Notification[]
>;
type FeedMarkAllNotificationsAsEvents = BaseEvents<
  'feeds.mark_all_notifications_as',
  MarkAllNotificationsAsArgs,
  number
>;
type FeedRemoveNotificationsEvents = BaseEvents<
  'feeds.remove_notifications',
  RemoveNotificationsArgs,
  Notification[] | undefined,
  Notification[],
  Notification[]
>;
type FeedRemoveAllNotificationsEvents = BaseEvents<'feeds.remove_all_notifications', RemoveAllNotificationsArgs, void>;
type NotificationMarkAsEvents = BaseEvents<
  'notification.mark_as',
  MarkNotificationAsArgs,
  Notification,
  Notification,
  Notification
>;
type NotificationMarkActionAsEvents = BaseEvents<
  'notification.mark_action_as',
  MarkNotificationActionAsArgs,
  Notification,
  Notification,
  Notification
>;
type NotificationRemoveEvents = BaseEvents<
  'notification.remove',
  RemoveNotificationArgs,
  Notification | undefined,
  Notification,
  Notification
>;
type PreferencesFetchEvents = BaseEvents<'preferences.fetch', FetchPreferencesArgs, Preference[]>;
type PreferencesUpdateEvents = BaseEvents<'preferences.update', UpdatePreferencesArgs, Preference>;
type SocketConnectEvents = BaseEvents<'socket.connect', { socketUrl: string }, undefined>;
export type NotificationReceivedEvent = `notifications.${WebSocketEvent.RECEIVED}`;
export type NotificationUnseenEvent = `notifications.${WebSocketEvent.UNSEEN}`;
export type NotificationUnreadEvent = `notifications.${WebSocketEvent.UNREAD}`;
type SocketEvents = {
  [key in NotificationReceivedEvent]: { result: Notification };
} & {
  [key in NotificationUnseenEvent]: { result: number };
} & {
  [key in NotificationUnreadEvent]: { result: number };
};

/**
 * Events that are emitted by Novu Event Emitter.
 *
 * The event name consists of second pattern: module.action.status
 * - module: the name of the module
 * - action: the action that is being performed
 * - status: the status of the action, could be pending, success or error
 *
 * Each event has a corresponding payload that is associated with the event:
 * - pending: the args that are passed to the action and the optional optimistic value
 * - success: the args that are passed to the action and the result of the action
 * - error: the args that are passed to the action, the error that is thrown, and the optional fallback value
 */
export type Events = SessionInitializeEvents &
  FeedFetchEvents &
  FeedFetchCountEvents &
  FeedMarkNotificationsAsEvents &
  FeedMarkAllNotificationsAsEvents &
  FeedRemoveNotificationsEvents &
  FeedRemoveAllNotificationsEvents &
  NotificationMarkAsEvents &
  NotificationMarkActionAsEvents &
  NotificationRemoveEvents &
  PreferencesFetchEvents &
  PreferencesUpdateEvents &
  SocketConnectEvents &
  SocketEvents;

export type EventNames = keyof Events;
export type SocketEventNames = keyof SocketEvents;

export type EventHandler<T = unknown> = (event: T) => void;
