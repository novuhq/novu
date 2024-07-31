import type {
  CountArgs,
  ListNotificationsArgs,
  Notification,
  ListNotificationsResponse,
  CountResponse,
  ReadArgs,
  ArchivedArgs,
  CompleteArgs,
  RevertArgs,
  UnarchivedArgs,
  UnreadArgs,
} from '../notifications';
import { Preference } from '../preferences/preference';
import { UpdatePreferencesArgs } from '../preferences/types';
import type { InitializeSessionArgs } from '../session';
import { InboxNotification, Session, WebSocketEvent } from '../types';

type NovuPendingEvent<A, D = undefined> = {
  args: A;
  data?: D;
};
type NovuResolvedEvent<A, D> = NovuPendingEvent<A, D> & {
  error?: unknown;
};
// three possible status of the event: pending, resolved
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
type NotificationReadEvents = BaseEvents<'notification.read', ReadArgs, InboxNotification>;
type NotificationUnreadEvents = BaseEvents<'notification.unread', UnreadArgs, InboxNotification>;
type NotificationArchiveEvents = BaseEvents<'notification.archive', ArchivedArgs, InboxNotification>;
type NotificationUnarchiveEvents = BaseEvents<'notification.unarchive', UnarchivedArgs, InboxNotification>;
type NotificationCompleteActionEvents = BaseEvents<'notification.complete_action', CompleteArgs, InboxNotification>;
type NotificationRevertActionEvents = BaseEvents<'notification.revert_action', RevertArgs, InboxNotification>;
type NotificationsReadAllEvents = BaseEvents<'notifications.read_all', { tags?: string[] }, void>;
type NotificationsArchivedAllEvents = BaseEvents<'notifications.archive_all', { tags?: string[] }, void>;
type NotificationsReadArchivedAllEvents = BaseEvents<'notifications.archive_all_read', { tags?: string[] }, void>;
type PreferencesFetchEvents = BaseEvents<'preferences.list', undefined, Preference[]>;
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
  NotificationsFetchEvents &
  NotificationsFetchCountEvents &
  PreferencesFetchEvents &
  PreferencesUpdateEvents &
  SocketConnectEvents &
  SocketEvents &
  NotificationReadEvents &
  NotificationUnreadEvents &
  NotificationArchiveEvents &
  NotificationUnarchiveEvents &
  NotificationCompleteActionEvents &
  NotificationRevertActionEvents &
  NotificationsReadAllEvents &
  NotificationsArchivedAllEvents &
  NotificationsReadArchivedAllEvents;

export type EventNames = keyof Events;
export type SocketEventNames = keyof SocketEvents;

export type EventHandler<T = unknown> = (event: T) => void;
