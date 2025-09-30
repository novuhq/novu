import 'event-target-polyfill';
import { WebSocket } from 'partysocket';
import { InboxService } from '../api';
import { BaseModule } from '../base-module';
import {
  NotificationReceivedEvent,
  NotificationUnreadEvent,
  NotificationUnseenEvent,
  NovuEventEmitter,
  SocketEventNames,
} from '../event-emitter';
import { Notification } from '../notifications';
import {
  ActionTypeEnum,
  InboxNotification,
  NotificationActionStatus,
  Result,
  Session,
  Subscriber,
  TODO,
  WebSocketEvent,
} from '../types';
import { NovuError } from '../utils/errors';
import type { BaseSocketInterface } from './base-socket';

export const PRODUCTION_SOCKET_URL = 'wss://socket.novu.co';
const NOTIFICATION_RECEIVED: NotificationReceivedEvent = 'notifications.notification_received';
const UNSEEN_COUNT_CHANGED: NotificationUnseenEvent = 'notifications.unseen_count_changed';
const UNREAD_COUNT_CHANGED: NotificationUnreadEvent = 'notifications.unread_count_changed';

const mapToNotification = ({
  _id,
  transactionId,
  content,
  read,
  seen,
  archived,
  snoozedUntil,
  deliveredAt,
  createdAt,
  lastReadDate,
  firstSeenDate,
  archivedAt,
  channel,
  subscriber,
  subject,
  avatar,
  cta,
  tags,
  data,
  workflow,
  severity,
}: TODO): InboxNotification => {
  const to: Subscriber = {
    id: subscriber?._id,
    subscriberId: subscriber?.subscriberId,
    firstName: subscriber?.firstName,
    lastName: subscriber?.lastName,
    avatar: subscriber?.avatar,
    locale: subscriber?.locale,
    data: subscriber?.data,
    timezone: subscriber?.timezone,
    email: subscriber?.email,
    phone: subscriber?.phone,
  };
  const primaryCta = cta.action?.buttons?.find((button: any) => button.type === ActionTypeEnum.PRIMARY);
  const secondaryCta = cta.action?.buttons?.find((button: any) => button.type === ActionTypeEnum.SECONDARY);
  const actionType = cta.action?.result?.type;
  const actionStatus = cta.action?.status;

  return {
    id: _id,
    transactionId,
    subject,
    body: content as string,
    to,
    isRead: read,
    isSeen: seen,
    isArchived: archived,
    isSnoozed: !!snoozedUntil,
    ...(deliveredAt && {
      deliveredAt,
    }),
    ...(snoozedUntil && {
      snoozedUntil,
    }),
    createdAt,
    readAt: lastReadDate,
    firstSeenAt: firstSeenDate,
    archivedAt,
    avatar,
    primaryAction: primaryCta && {
      label: primaryCta.content,
      isCompleted: actionType === ActionTypeEnum.PRIMARY && actionStatus === NotificationActionStatus.DONE,
      redirect: primaryCta.url
        ? {
            target: primaryCta.target,
            url: primaryCta.url,
          }
        : undefined,
    },
    secondaryAction: secondaryCta && {
      label: secondaryCta.content,
      isCompleted: actionType === ActionTypeEnum.SECONDARY && actionStatus === NotificationActionStatus.DONE,
      redirect: secondaryCta.url
        ? {
            target: secondaryCta.target,
            url: secondaryCta.url,
          }
        : undefined,
    },
    channelType: channel,
    tags,
    redirect: cta.data?.url
      ? {
          url: cta.data.url,
          target: cta.data.target,
        }
      : undefined,
    data,
    workflow,
    severity,
  };
};

export class PartySocketClient extends BaseModule implements BaseSocketInterface {
  #token: string;
  #emitter: NovuEventEmitter;
  #partySocket: WebSocket | undefined;
  #socketUrl: string;

  constructor({
    socketUrl,
    inboxServiceInstance,
    eventEmitterInstance,
  }: {
    socketUrl?: string;
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
  }) {
    super({
      eventEmitterInstance,
      inboxServiceInstance,
    });
    this.#emitter = eventEmitterInstance;
    this.#socketUrl = socketUrl ?? PRODUCTION_SOCKET_URL;
  }

  protected onSessionSuccess({ token }: Session): void {
    this.#token = token;
  }

  #notificationReceived = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.event === WebSocketEvent.RECEIVED) {
        this.#emitter.emit(NOTIFICATION_RECEIVED, {
          result: new Notification(mapToNotification(data.data.message), this.#emitter, this._inboxService),
        });
      }
    } catch (error) {
      console.log('error', error);
      // Failed to parse notification received event
    }
  };

  #unseenCountChanged = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.event === WebSocketEvent.UNSEEN) {
        this.#emitter.emit(UNSEEN_COUNT_CHANGED, {
          result: data.data.unseenCount,
        });
      }
    } catch (error) {
      // Failed to parse unseen count changed event
    }
  };

  #unreadCountChanged = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.event === WebSocketEvent.UNREAD) {
        this.#emitter.emit(UNREAD_COUNT_CHANGED, {
          result: data.data.counts,
        });
      }
    } catch (error) {
      // Failed to parse unread count changed event
    }
  };

  #handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.event) {
        case WebSocketEvent.RECEIVED:
          this.#notificationReceived(event);
          break;
        case WebSocketEvent.UNSEEN:
          this.#unseenCountChanged(event);
          break;
        case WebSocketEvent.UNREAD:
          this.#unreadCountChanged(event);
          break;
        default:
        // Unknown WebSocket event type
      }
    } catch (error) {
      // Failed to parse WebSocket message
    }
  };

  async #initializeSocket(): Promise<void> {
    if (this.#partySocket) {
      return;
    }

    const args = { socketUrl: this.#socketUrl };
    this.#emitter.emit('socket.connect.pending', { args });

    const url = new URL(this.#socketUrl);
    url.searchParams.set('token', this.#token);

    this.#partySocket = new WebSocket(url.toString());

    this.#partySocket.addEventListener('open', () => {
      this.#emitter.emit('socket.connect.resolved', { args });
    });

    this.#partySocket.addEventListener('error', (error) => {
      this.#emitter.emit('socket.connect.resolved', { args, error });
    });

    this.#partySocket.addEventListener('message', this.#handleMessage);
  }

  async #handleConnectSocket(): Result<void> {
    try {
      await this.#initializeSocket();

      return {};
    } catch (error) {
      return { error: new NovuError('Failed to initialize the PartySocket', error) };
    }
  }

  async #handleDisconnectSocket(): Result<void> {
    try {
      this.#partySocket?.close();
      this.#partySocket = undefined;

      return {};
    } catch (error) {
      return { error: new NovuError('Failed to disconnect from the PartySocket', error) };
    }
  }

  isSocketEvent(eventName: string): eventName is SocketEventNames {
    return (
      eventName === NOTIFICATION_RECEIVED || eventName === UNSEEN_COUNT_CHANGED || eventName === UNREAD_COUNT_CHANGED
    );
  }

  async connect(): Result<void> {
    if (this.#token) {
      return this.#handleConnectSocket();
    }

    return this.callWithSession(this.#handleConnectSocket.bind(this));
  }

  async disconnect(): Result<void> {
    if (this.#partySocket) {
      return this.#handleDisconnectSocket();
    }

    return this.callWithSession(this.#handleDisconnectSocket.bind(this));
  }
}
