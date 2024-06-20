import type { ApiService } from '@novu/client';

import { EventHandler, EventNames, Events, NovuEventEmitter } from '../event-emitter';
import { Avatar, NotificationActionStatus, NotificationButton, Cta, NotificationStatus, TODO } from '../types';
import { ApiServiceSingleton } from '../utils/api-service-singleton';
import { markActionAs, markNotificationAs, remove } from './helpers';

type NotificationLike = Pick<
  Notification,
  'id' | 'feedIdentifier' | 'createdAt' | 'avatar' | 'body' | 'read' | 'seen' | 'deleted' | 'cta'
>;

export class Notification implements Pick<NovuEventEmitter, 'on' | 'off'> {
  #emitter: NovuEventEmitter;
  #apiService: ApiService;

  readonly id: string;
  readonly feedIdentifier?: string | null;
  readonly createdAt: string;
  readonly avatar?: Avatar;
  readonly body: string;
  readonly read: boolean;
  readonly seen: boolean;
  readonly deleted: boolean;
  readonly cta: Cta;

  constructor(notification: NotificationLike) {
    this.#emitter = NovuEventEmitter.getInstance();
    this.#apiService = ApiServiceSingleton.getInstance();

    this.id = notification.id;
    this.feedIdentifier = notification.feedIdentifier;
    this.createdAt = notification.createdAt;
    this.avatar = notification.avatar;
    this.body = notification.body;
    this.read = notification.read;
    this.seen = notification.seen;
    this.deleted = notification.deleted;
    this.cta = notification.cta;
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
    this.#emitter.off(eventName, listener);
  }
}
