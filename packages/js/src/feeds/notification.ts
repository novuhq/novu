import { ApiService } from '@novu/client';

import { EventHandler, EventNames, Events, NovuEventEmitter } from '../event-emitter';
import {
  Actor,
  NotificationActionStatus,
  NotificationButton,
  Cta,
  NotificationStatus,
  Subscriber,
  TODO,
} from '../types';
import { ApiServiceSingleton } from '../utils/api-service-singleton';
import { markActionAs, markNotificationAs, remove } from './helpers';

type NotificationLike = Pick<
  Notification,
  | '_id'
  | '_feedId'
  | 'createdAt'
  | 'updatedAt'
  | 'actor'
  | 'subscriber'
  | 'transactionId'
  | 'content'
  | 'read'
  | 'seen'
  | 'deleted'
  | 'cta'
  | 'payload'
  | 'overrides'
>;

export class Notification implements Pick<NovuEventEmitter, 'on' | 'off'> {
  #emitter: NovuEventEmitter;
  #apiService: ApiService;

  _id: string;
  _feedId?: string | null;
  createdAt: string;
  updatedAt: string;
  actor?: Actor;
  subscriber?: Subscriber;
  transactionId: string;
  content: string;
  read: boolean;
  seen: boolean;
  deleted: boolean;
  cta: Cta;
  payload: Record<string, unknown>;
  overrides: Record<string, unknown>;

  constructor(notification: NotificationLike) {
    this.#emitter = NovuEventEmitter.getInstance();
    this.#apiService = ApiServiceSingleton.getInstance();

    this._id = notification._id;
    this._feedId = notification._feedId;
    this.createdAt = notification.createdAt;
    this.updatedAt = notification.updatedAt;
    this.actor = notification.actor;
    this.subscriber = notification.subscriber;
    this.transactionId = notification.transactionId;
    this.content = notification.content;
    this.read = notification.read;
    this.seen = notification.seen;
    this.deleted = notification.deleted;
    this.cta = notification.cta;
    this.payload = notification.payload;
    this.overrides = notification.overrides;
  }

  markAsRead(): Promise<Notification> {
    return markNotificationAs({
      emitter: this.#emitter,
      apiService: this.#apiService,
      args: {
        notification: this,
        status: NotificationStatus.READ,
      },
    });
  }

  markAsUnread(): Promise<Notification> {
    return markNotificationAs({
      emitter: this.#emitter,
      apiService: this.#apiService,
      args: {
        notification: this,
        status: NotificationStatus.UNREAD,
      },
    });
  }

  markAsSeen(): Promise<Notification> {
    return markNotificationAs({
      emitter: this.#emitter,
      apiService: this.#apiService,
      args: {
        notification: this,
        status: NotificationStatus.SEEN,
      },
    });
  }

  markAsUnseen(): Promise<Notification> {
    return markNotificationAs({
      emitter: this.#emitter,
      apiService: this.#apiService,
      args: {
        notification: this,
        status: NotificationStatus.UNSEEN,
      },
    });
  }

  markActionAsDone(button: NotificationButton = NotificationButton.PRIMARY): Promise<Notification> {
    return markActionAs({
      apiService: this.#apiService,
      emitter: this.#emitter,
      args: {
        notification: this,
        button,
        status: NotificationActionStatus.DONE,
      },
    });
  }

  markActionAsPending(button: NotificationButton = NotificationButton.PRIMARY): Promise<Notification> {
    return markActionAs({
      apiService: this.#apiService,
      emitter: this.#emitter,
      args: {
        notification: this,
        button,
        status: NotificationActionStatus.PENDING,
      },
    });
  }

  remove(): Promise<Notification> {
    return remove({
      apiService: this.#apiService,
      emitter: this.#emitter,
      args: {
        notification: this,
      },
    }) as TODO;
  }

  on<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#emitter.on(eventName, listener);
  }

  off<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#emitter.on(eventName, listener);
  }
}
