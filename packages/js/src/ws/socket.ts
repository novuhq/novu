import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import io, { Socket as SocketIO } from 'socket.io-client';
import type { InboxService } from '../api';
import { BaseModule } from '../base-module';
import {
  NotificationReceivedEvent,
  NotificationUnreadEvent,
  NotificationUnseenEvent,
  NovuEventEmitter,
  SocketEventNames,
  WebChatAgentEvent,
} from '../event-emitter';
import { Notification } from '../notifications';
import { Result, Session, WebSocketEvent } from '../types';
import { NovuError } from '../utils/errors';
import type { BaseSocketInterface, SocketSession } from './base-socket';
import { mapToNotification, type SocketMessage } from './map-to-notification';

const PRODUCTION_SOCKET_URL = 'https://ws.novu.co';
const NOTIFICATION_RECEIVED: NotificationReceivedEvent = 'notifications.notification_received';
const UNSEEN_COUNT_CHANGED: NotificationUnseenEvent = 'notifications.unseen_count_changed';
const UNREAD_COUNT_CHANGED: NotificationUnreadEvent = 'notifications.unread_count_changed';
const WEB_CHAT_AGENT_EVENT: WebChatAgentEvent = 'web_chat.agent_event';

export class Socket extends BaseModule implements BaseSocketInterface {
  #token: string;
  #emitter: NovuEventEmitter;
  #socketIo: SocketIO | undefined;
  #socketUrl: string;
  #socketOptions?: Record<string, unknown>;
  #session?: SocketSession;
  /** The token sent with the latest connection attempt. */
  #handshakeToken: string | undefined;
  #tokenRetryTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor({
    socketUrl,
    socketOptions,
    inboxServiceInstance,
    eventEmitterInstance,
    session,
  }: {
    socketUrl?: string;
    socketOptions?: Record<string, unknown>;
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
    session?: SocketSession;
  }) {
    super({
      eventEmitterInstance,
      inboxServiceInstance,
    });
    this.#emitter = eventEmitterInstance;
    this.#socketUrl = socketUrl ?? PRODUCTION_SOCKET_URL;
    this.#socketOptions = socketOptions;
    this.#session = session;
  }

  protected onSessionSuccess({ token }: Session): void {
    this.#token = token;
  }

  #notificationReceived = ({ message }: { message: SocketMessage }) => {
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

  #agentEvent = (envelope: AgentEventEnvelope) => {
    this.#emitter.emit(WEB_CHAT_AGENT_EVENT, {
      result: envelope,
    });
  };

  /** Sends the current token with the next connection attempt. */
  #useCurrentToken(socket: SocketIO): void {
    socket.io.opts.query = { ...socket.io.opts.query, token: `${this.#token}` };
    this.#handshakeToken = this.#token;
  }

  /**
   * The server checks the token only when the socket connects. When it rejects an expired token it disconnects
   * the socket, and socket.io does not reconnect after a server disconnect, so get a new token and connect again.
   */
  async #reconnectWithFreshToken(socket: SocketIO): Promise<void> {
    this.#tokenRetryTimeout = undefined;
    const session = this.#session;
    if (!session || socket !== this.#socketIo || !session.isExpired(this.#handshakeToken)) {
      return;
    }

    const hasFreshToken = !session.isExpired(this.#token) || (await session.refresh().catch(() => false));

    if (socket !== this.#socketIo) {
      return;
    }

    if (!hasFreshToken) {
      // socket.io stopped retrying after the server disconnect, so keep trying here until a token comes back.
      this.#tokenRetryTimeout = setTimeout(
        () => void this.#reconnectWithFreshToken(socket),
        socket.io.reconnectionDelayMax()
      );

      return;
    }

    this.#useCurrentToken(socket);
    socket.connect();
  }

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
      ...(this.#socketOptions ?? {}),
    });

    const socket = this.#socketIo;
    this.#handshakeToken = this.#token;

    socket.io.on('reconnect_attempt', () => {
      this.#useCurrentToken(socket);

      if (this.#session?.isExpired(this.#token)) {
        // This attempt still carries the expired token; the next one picks up the new token.
        this.#session.refresh().catch(() => false);
      }
    });

    this.#socketIo.on('connect', () => {
      this.#emitter.emit('socket.connect.resolved', { args });
    });

    this.#socketIo.on('connect_error', (error) => {
      this.#emitter.emit('socket.connect.resolved', { args, error });
    });

    this.#socketIo.on('disconnect', (reason) => {
      if (this.#socketIo !== undefined && socket !== this.#socketIo) {
        return;
      }

      this.#emitter.emit('socket.disconnect.resolved', { args });

      if (reason === 'io server disconnect') {
        void this.#reconnectWithFreshToken(socket);
      }
    });

    this.#socketIo?.on(WebSocketEvent.RECEIVED, this.#notificationReceived);
    this.#socketIo?.on(WebSocketEvent.UNSEEN, this.#unseenCountChanged);
    this.#socketIo?.on(WebSocketEvent.UNREAD, this.#unreadCountChanged);
    this.#socketIo?.on(WebSocketEvent.AGENT_EVENT, this.#agentEvent);
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
      clearTimeout(this.#tokenRetryTimeout);
      this.#tokenRetryTimeout = undefined;
      this.#socketIo?.disconnect();
      this.#socketIo = undefined;

      return {};
    } catch (error) {
      return { error: new NovuError('Failed to disconnect from the socket', error) };
    }
  }

  isSocketEvent(eventName: string): eventName is SocketEventNames {
    return (
      eventName === NOTIFICATION_RECEIVED ||
      eventName === UNSEEN_COUNT_CHANGED ||
      eventName === UNREAD_COUNT_CHANGED ||
      eventName === WEB_CHAT_AGENT_EVENT
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
