import { InboxService } from '../api';
import { InboxServiceSingleton } from '../utils/inbox-service-singleton';
import { EventHandler, EventNames, Events, NovuEventEmitter } from '../event-emitter';
import { ActionTypeEnum, InboxNotification } from '../types';
import { archive, completeAction, read, revertAction, unarchive, unread } from './helpers';

export class Notification implements Pick<NovuEventEmitter, 'on' | 'off'>, InboxNotification {
  #emitter: NovuEventEmitter;
  #inboxService: InboxService;

  readonly id: InboxNotification['id'];
  readonly subject?: InboxNotification['subject'];
  readonly body: InboxNotification['body'];
  readonly to: InboxNotification['to'];
  readonly isRead: InboxNotification['isRead'];
  readonly isArchived: InboxNotification['isArchived'];
  readonly createdAt: InboxNotification['createdAt'];
  readonly readAt?: InboxNotification['readAt'];
  readonly archivedAt?: InboxNotification['archivedAt'];
  readonly avatar?: InboxNotification['avatar'];
  readonly primaryAction?: InboxNotification['primaryAction'];
  readonly secondaryAction?: InboxNotification['secondaryAction'];
  readonly channelType: InboxNotification['channelType'];
  readonly tags: InboxNotification['tags'];

  constructor(notification: InboxNotification) {
    this.#emitter = NovuEventEmitter.getInstance();
    this.#inboxService = InboxServiceSingleton.getInstance();

    this.id = notification.id;
    this.subject = notification.subject;
    this.body = notification.body;
    this.to = notification.to;
    this.isRead = notification.isRead;
    this.isArchived = notification.isArchived;
    this.createdAt = notification.createdAt;
    this.readAt = notification.readAt;
    this.archivedAt = notification.archivedAt;
    this.avatar = notification.avatar;
    this.primaryAction = notification.primaryAction;
    this.secondaryAction = notification.secondaryAction;
    this.channelType = notification.channelType;
    this.tags = notification.tags;
  }

  read(): Promise<Notification> {
    return read({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: {
        notification: this,
      },
    });
  }

  unread(): Promise<Notification> {
    return unread({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: {
        notification: this,
      },
    });
  }

  archive(): Promise<Notification> {
    return archive({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: {
        notification: this,
      },
    });
  }

  unarchive(): Promise<Notification> {
    return unarchive({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: {
        notification: this,
      },
    });
  }

  completePrimary(): Promise<Notification> {
    if (!this.primaryAction) {
      throw new Error('Primary action is not available');
    }

    return completeAction({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: {
        notification: this,
      },
      actionType: ActionTypeEnum.PRIMARY,
    });
  }

  completeSecondary(): Promise<Notification> {
    if (!this.primaryAction) {
      throw new Error('Secondary action is not available');
    }

    return completeAction({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: {
        notification: this,
      },
      actionType: ActionTypeEnum.SECONDARY,
    });
  }

  revertPrimary(): Promise<Notification> {
    if (!this.primaryAction) {
      throw new Error('Primary action is not available');
    }

    return revertAction({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: {
        notification: this,
      },
      actionType: ActionTypeEnum.PRIMARY,
    });
  }

  revertSecondary(): Promise<Notification> {
    if (!this.primaryAction) {
      throw new Error('Secondary action is not available');
    }

    return revertAction({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: {
        notification: this,
      },
      actionType: ActionTypeEnum.SECONDARY,
    });
  }

  on<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#emitter.on(eventName, listener);
  }

  off<Key extends EventNames>(eventName: Key, listener: EventHandler<Events[Key]>): void {
    this.#emitter.off(eventName, listener);
  }
}
