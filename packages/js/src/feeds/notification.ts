import type { ApiService } from '@novu/client';
import { InboxService } from '../api';
import { InboxServiceSingleton } from '../utils/inbox-service-singleton';
import { ChannelTypeEnum, Notification as NotificationType, Subscriber } from '../api/types';

import { EventHandler, EventNames, Events, NovuEventEmitter } from '../event-emitter';
import { Cta, NotificationActionStatus, NotificationButton, NotificationStatus, TODO } from '../types';
import { ApiServiceSingleton } from '../utils/api-service-singleton';
import {
  markActionAs,
  markArchived,
  markNotificationAs,
  markRead,
  markUnarchived,
  markUnread,
  remove,
} from './helpers';

type NotificationLike = Pick<
  Notification,
  | 'id'
  | 'feedIdentifier'
  | 'createdAt'
  | 'avatar'
  | 'body'
  | 'read'
  | 'seen'
  | 'deleted'
  | 'cta'
  | 'to'
  | 'channelType'
  | 'archived'
>;

export class Notification implements Pick<NovuEventEmitter, 'on' | 'off'> {
  #emitter: NovuEventEmitter;
  #apiService: ApiService;
  #inboxService: InboxService;

  readonly id: string;
  readonly feedIdentifier?: string | null;
  readonly createdAt: string;
  readonly avatar?: NotificationType['avatar'];
  readonly body: string;
  readonly read: boolean;
  readonly seen: boolean;
  readonly deleted: boolean;
  readonly cta: Cta;
  readonly to: Subscriber;
  readonly channelType: ChannelTypeEnum;
  readonly archived: boolean;

  constructor(notification: NotificationLike) {
    this.#emitter = NovuEventEmitter.getInstance();
    this.#apiService = ApiServiceSingleton.getInstance();
    this.#inboxService = InboxServiceSingleton.getInstance();

    this.id = notification.id;
    this.feedIdentifier = notification.feedIdentifier;
    this.createdAt = notification.createdAt;
    this.avatar = notification.avatar;
    this.body = notification.body;
    this.read = notification.read;
    this.seen = notification.seen;
    this.deleted = notification.deleted;
    this.cta = notification.cta;
    this.to = notification.to;
    this.channelType = notification.channelType;
    this.archived = notification.archived;
  }

  markAsRead(): Promise<Notification> {
    return markRead({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: {
        notification: this,
      },
    });
  }

  markAsUnread(): Promise<Notification> {
    return markUnread({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: {
        notification: this,
      },
    });
  }

  markAsArchived(): Promise<Notification> {
    return markArchived({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: {
        notification: this,
      },
    });
  }

  markAsUnarchived(): Promise<Notification> {
    return markUnarchived({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: {
        notification: this,
      },
    });
  }

  /**
   * @deprecated
   */
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

  /**
   * @deprecated
   */
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
