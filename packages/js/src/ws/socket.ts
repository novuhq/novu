import io, { Socket as SocketIO } from 'socket.io-client';
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

const PRODUCTION_SOCKET_URL = 'https://ws.novu.co';
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

export class Socket extends BaseModule implements BaseSocketInterface {
  #token: string;
  #emitter: NovuEventEmitter;
  #socketIo: SocketIO | undefined;
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

  #notificationReceived = ({ message }: { message: TODO }) => {
    this.#emitter.emit(NOTIFICATION_RECEIVED, {
      result: new Notification(mapToNotification(message), this.#emitter, this._inboxService),
    });
  };

  #unseenCountChanged = ({ unseenCount }: { unseenCount: number }) => {
    this.#emitter.emit(UNSEEN_COUNT_CHANGED, {
      result: unseenCount,
    });
  };

  #unreadCountChanged = ({ counts }: { counts: { total: number; severity: Record<string, number> } }) => {
    this.#emitter.emit(UNREAD_COUNT_CHANGED, {
      result: counts,
    });
  };

  async #initializeSocket(): Promise<void> {
    if (this.#socketIo) {
      return;
    }

    const args = { socketUrl: this.#socketUrl };
    this.#emitter.emit('socket.connect.pending', { args });

    this.#socketIo = io(this.#socketUrl, {
      reconnectionDelayMax: 10000,
      transports: ['websocket'],
      query: {
        token: `${this.#token}`,
      },
    });

    this.#socketIo.on('connect', () => {
      this.#emitter.emit('socket.connect.resolved', { args });
    });

    this.#socketIo.on('connect_error', (error) => {
      this.#emitter.emit('socket.connect.resolved', { args, error });
    });

    this.#socketIo?.on(WebSocketEvent.RECEIVED, this.#notificationReceived);
    this.#socketIo?.on(WebSocketEvent.UNSEEN, this.#unseenCountChanged);
    this.#socketIo?.on(WebSocketEvent.UNREAD, this.#unreadCountChanged);
  }

  async #handleConnectSocket(): Result<void> {
    try {
      await this.#initializeSocket();

      return {};
    } catch (error) {
      return { error: new NovuError('Failed to initialize the socket', error) };
    }
  }

  async #handleDisconnectSocket(): Result<void> {
    try {
      this.#socketIo?.disconnect();
      this.#socketIo = undefined;

      return {};
    } catch (error) {
      return { error: new NovuError('Failed to disconnect from the socket', error) };
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
    if (this.#socketIo) {
      return this.#handleDisconnectSocket();
    }

    return this.callWithSession(this.#handleDisconnectSocket.bind(this));
  }
}
