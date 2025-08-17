import type {
  ArchivedArgs,
  CompleteArgs,
  CountArgs,
  CountResponse,
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
import { ListPreferencesArgs, UpdatePreferenceArgs } from '../preferences/types';
import type { InitializeSessionArgs } from '../session';
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
type NotificationSnoozeEvents = BaseEvents<'notification.snooze', SnoozeArgs, Notification>;
type NotificationUnsnoozeEvents = BaseEvents<'notification.unsnooze', UnsnoozeArgs, Notification>;
type NotificationCompleteActionEvents = BaseEvents<'notification.complete_action', CompleteArgs, Notification>;
type NotificationRevertActionEvents = BaseEvents<'notification.revert_action', RevertArgs, Notification>;
type NotificationsReadAllEvents = BaseEvents<
  'notifications.read_all',
  { tags?: string[]; data?: Record<string, unknown> },
  Notification[]
>;
type NotificationsSeenAllEvents = BaseEvents<
  'notifications.seen_all',
  { notificationIds: string[] } | { tags?: string[]; data?: Record<string, unknown> } | {},
  Notification[]
>;
type NotificationsArchivedAllEvents = BaseEvents<
  'notifications.archive_all',
  { tags?: string[]; data?: Record<string, unknown> },
  Notification[]
>;
type NotificationsReadArchivedAllEvents = BaseEvents<
  'notifications.archive_all_read',
  { tags?: string[]; data?: Record<string, unknown> },
  Notification[]
>;
type PreferencesFetchEvents = BaseEvents<'preferences.list', ListPreferencesArgs, Preference[]>;
type PreferenceUpdateEvents = BaseEvents<'preference.update', UpdatePreferenceArgs, Preference>;
type PreferencesBulkUpdateEvents = BaseEvents<'preferences.bulk_update', Array<UpdatePreferenceArgs>, Preference[]>;
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
  SocketConnectEvents &
  SocketEvents &
  NotificationReadEvents &
  NotificationUnreadEvents &
  NotificationSeenEvents &
  NotificationArchiveEvents &
  NotificationUnarchiveEvents &
  NotificationSnoozeEvents &
  NotificationUnsnoozeEvents &
  NotificationCompleteActionEvents &
  NotificationRevertActionEvents &
  NotificationsReadAllEvents &
  NotificationsSeenAllEvents &
  NotificationsArchivedAllEvents &
  NotificationsReadArchivedAllEvents;

export type EventNames = keyof Events;
export type SocketEventNames = keyof SocketEvents;
export type NotificationEvents = keyof (NotificationReadEvents &
  NotificationUnreadEvents &
  NotificationSeenEvents &
  NotificationArchiveEvents &
  NotificationUnarchiveEvents &
  NotificationSnoozeEvents &
  NotificationUnsnoozeEvents &
  NotificationCompleteActionEvents &
  NotificationRevertActionEvents &
  NotificationsReadAllEvents &
  NotificationsSeenAllEvents &
  NotificationsArchivedAllEvents &
  NotificationsReadArchivedAllEvents);
export type PreferenceEvents = keyof (PreferenceUpdateEvents & PreferencesBulkUpdateEvents);

export type EventHandler<T = unknown> = (event: T) => void;
