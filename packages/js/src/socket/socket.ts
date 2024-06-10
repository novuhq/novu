import io, { Socket as SocketIO } from 'socket.io-client';
import { BaseModule } from '../base-module';

import {
  NotificationReceivedEvent,
  NotificationUnseenEvent,
  NotificationUnreadEvent,
  NovuEventEmitter,
  SocketEventNames,
} from '../event-emitter';
import { Notification } from '../feeds';
import { Session, TODO, WebSocketEvent } from '../types';

const PRODUCTION_SOCKET_URL = 'https://ws.novu.co';
const NOTIFICATION_RECEIVED: NotificationReceivedEvent = 'notifications.notification_received';
const UNSEEN_COUNT_CHANGED: NotificationUnseenEvent = 'notifications.unseen_count_changed';
const UNREAD_COUNT_CHANGED: NotificationUnreadEvent = 'notifications.unread_count_changed';

export class Socket extends BaseModule {
  #token: string;
  #emitter: NovuEventEmitter;
  #socketIo: SocketIO | undefined;
  #socketUrl: string;

  constructor({ socketUrl }: { socketUrl?: string }) {
    super();
    this.#emitter = NovuEventEmitter.getInstance();
    this.#socketUrl = socketUrl ?? PRODUCTION_SOCKET_URL;
  }

  protected onSessionSuccess({ token }: Session): void {
    this.#token = token;
  }

  #notificationReceived = ({ message }: { message: TODO }) => {
    this.#emitter.emit(NOTIFICATION_RECEIVED, {
      result: new Notification(message),
    });
  };

  #unseenCountChanged = ({ unseenCount }: { unseenCount: number }) => {
    this.#emitter.emit(UNSEEN_COUNT_CHANGED, {
      result: unseenCount,
    });
  };

  #unreadCountChanged = ({ unreadCount }: { unreadCount: number }) => {
    this.#emitter.emit(UNREAD_COUNT_CHANGED, {
      result: unreadCount,
    });
  };

  async #initializeSocket(): Promise<void> {
    if (!!this.#socketIo) {
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
      this.#emitter.emit('socket.connect.success', { args, result: undefined });
    });

    this.#socketIo.on('connect_error', (error) => {
      this.#emitter.emit('socket.connect.error', { args, error });
    });

    this.#socketIo?.on(WebSocketEvent.RECEIVED, this.#notificationReceived);
    this.#socketIo?.on(WebSocketEvent.UNSEEN, this.#unseenCountChanged);
    this.#socketIo?.on(WebSocketEvent.UNREAD, this.#unreadCountChanged);
  }

  isSocketEvent(eventName: string): eventName is SocketEventNames {
    return (
      eventName === NOTIFICATION_RECEIVED || eventName === UNSEEN_COUNT_CHANGED || eventName === UNREAD_COUNT_CHANGED
    );
  }

  initialize(): void {
    if (this.#token) {
      this.#initializeSocket().then((error) => console.error(error));

      return;
    }

    this.callWithSession(async () => {
      this.#initializeSocket().then((error) => console.error(error));
    });
  }
}
