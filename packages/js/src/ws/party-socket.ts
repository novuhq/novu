import 'event-target-polyfill';
import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { WebSocket } from 'partysocket';
import type { InboxService, SessionRefresher } from '../api';
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
import { sanitizeInAppRedirect } from '../utils/in-app-redirect-url';
import { isJwtExpired } from '../utils/jwt';
import type { BaseSocketInterface } from './base-socket';

export const PRODUCTION_SOCKET_URL = 'wss://socket.novu.co';

const HIBERNATION_HEARTBEAT_MS = 25_000;
const HIBERNATION_PING_PAYLOAD = 'ping';

const NOTIFICATION_RECEIVED: NotificationReceivedEvent = 'notifications.notification_received';
const UNSEEN_COUNT_CHANGED: NotificationUnseenEvent = 'notifications.unseen_count_changed';
const UNREAD_COUNT_CHANGED: NotificationUnreadEvent = 'notifications.unread_count_changed';
const WEB_CHAT_AGENT_EVENT: WebChatAgentEvent = 'web_chat.agent_event';

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
  const primaryCta = cta.action?.buttons?.find((button: { type?: string }) => button.type === ActionTypeEnum.PRIMARY);
  const secondaryCta = cta.action?.buttons?.find(
    (button: { type?: string }) => button.type === ActionTypeEnum.SECONDARY
  );
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
      redirect: sanitizeInAppRedirect(primaryCta.url, primaryCta.target),
    },
    secondaryAction: secondaryCta && {
      label: secondaryCta.content,
      isCompleted: actionType === ActionTypeEnum.SECONDARY && actionStatus === NotificationActionStatus.DONE,
      redirect: sanitizeInAppRedirect(secondaryCta.url, secondaryCta.target),
    },
    channelType: channel,
    tags,
    redirect: sanitizeInAppRedirect(cta.data?.url, cta.data?.target),
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
  #socketOptions?: Record<string, unknown>;
  #hibernationHeartbeatIntervalId: ReturnType<typeof setInterval> | undefined;
  /** partysocket's retryCount at the last open or close, to tell a scheduled retry from giving up */
  #lastRetryCount = 0;
  #hasGivenUp = false;
  /** Set once 'socket.disconnect.resolved' went out for the current outage, cleared on 'open' */
  #disconnectEmitted = false;
  #refreshSession?: SessionRefresher;

  constructor({
    socketUrl,
    socketOptions,
    inboxServiceInstance,
    eventEmitterInstance,
    refreshSession,
  }: {
    socketUrl?: string;
    socketOptions?: Record<string, unknown>;
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
    refreshSession?: SessionRefresher;
  }) {
    super({
      eventEmitterInstance,
      inboxServiceInstance,
    });
    this.#emitter = eventEmitterInstance;
    this.#socketUrl = socketUrl ?? PRODUCTION_SOCKET_URL;
    this.#socketOptions = socketOptions;
    this.#refreshSession = refreshSession;
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

  #agentEvent = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.event === WebSocketEvent.AGENT_EVENT) {
        this.#emitter.emit(WEB_CHAT_AGENT_EVENT, {
          result: data.data as AgentEventEnvelope,
        });
      }
    } catch (error) {
      // Failed to parse agent event
    }
  };

  #handleMessage = (event: MessageEvent) => {
    if (event.data === HIBERNATION_PING_PAYLOAD || event.data === 'pong') {
      return;
    }

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
        case WebSocketEvent.AGENT_EVENT:
          this.#agentEvent(event);
          break;
        default:
        // Unknown WebSocket event type
      }
    } catch (error) {
      // Failed to parse WebSocket message
    }
  };

  #clearHibernationHeartbeat(): void {
    if (this.#hibernationHeartbeatIntervalId !== undefined) {
      clearInterval(this.#hibernationHeartbeatIntervalId);
      this.#hibernationHeartbeatIntervalId = undefined;
    }
  }

  #clearCurrentSocket(): void {
    this.#clearHibernationHeartbeat();
    this.#partySocket = undefined;
  }

  #startHibernationHeartbeat(): void {
    this.#clearHibernationHeartbeat();

    this.#hibernationHeartbeatIntervalId = setInterval(() => {
      const socket = this.#partySocket;

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        socket.send(HIBERNATION_PING_PAYLOAD);
      } catch {
        // Socket may have closed between readyState check and send
      }
    }, HIBERNATION_HEARTBEAT_MS);
  }

  /**
   * partysocket bumps retryCount when a close schedules another attempt. At a caller-provided `maxRetries` it
   * leaves the count as it was and stops for good; its `reconnect()` cannot restart it from there.
   */
  #trackGiveUp(socket: WebSocket): void {
    const maxRetries = Number(this.#socketOptions?.maxRetries ?? Number.POSITIVE_INFINITY);

    this.#hasGivenUp = socket.retryCount >= maxRetries && socket.retryCount === this.#lastRetryCount;
    this.#lastRetryCount = socket.retryCount;
  }

  /**
   * The socket only checks the token when it connects, so an open socket keeps working after the token expires.
   * A reconnect with the expired token would be rejected on every attempt, so get a new token first.
   */
  #getSocketUrl = async (): Promise<string> => {
    if (this.#refreshSession && isJwtExpired(this.#token)) {
      await this.#refreshSession().catch(() => false);
    }

    const url = new URL(this.#socketUrl);
    url.searchParams.set('token', this.#token);

    return url.toString();
  };

  async #initializeSocket(): Promise<void> {
    if (this.#partySocket && this.#hasGivenUp) {
      const deadSocket = this.#partySocket;
      this.#clearCurrentSocket();
      deadSocket.close();
    }

    if (this.#partySocket) {
      return;
    }

    const args = { socketUrl: this.#socketUrl };
    this.#emitter.emit('socket.connect.pending', { args });

    // PartySocket calls the URL provider before every connection attempt, including reconnects.
    this.#partySocket = new WebSocket(this.#getSocketUrl, undefined, this.#socketOptions);

    const socket = this.#partySocket;
    this.#lastRetryCount = socket.retryCount;
    this.#hasGivenUp = false;
    this.#disconnectEmitted = false;

    socket.addEventListener('open', () => {
      this.#lastRetryCount = socket.retryCount;
      this.#disconnectEmitted = false;
      this.#startHibernationHeartbeat();
      this.#emitter.emit('socket.connect.resolved', { args });
    });

    socket.addEventListener('error', (error) => {
      this.#emitter.emit('socket.connect.resolved', { args, error });
    });

    socket.addEventListener('close', () => {
      if (socket !== this.#partySocket) {
        return;
      }

      /*
       * Keep the reference: partysocket reconnects this same instance on its own, and the 'open' listener
       * restarts the heartbeat. Dropping it here made the next connect() open a second socket while this one
       * kept reconnecting in the background, never to be closed.
       */
      this.#clearHibernationHeartbeat();
      this.#trackGiveUp(socket);

      if (!this.#disconnectEmitted) {
        this.#disconnectEmitted = true;
        this.#emitter.emit('socket.disconnect.resolved', { args });
      }
    });

    socket.addEventListener('message', this.#handleMessage);
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
      const socket = this.#partySocket;
      this.#clearCurrentSocket();
      socket?.close();

      // A drop already reported this outage; the socket was only reconnecting
      if (socket && !this.#disconnectEmitted) {
        this.#emitter.emit('socket.disconnect.resolved', { args: { socketUrl: this.#socketUrl } });
      }
      this.#disconnectEmitted = false;

      return {};
    } catch (error) {
      return { error: new NovuError('Failed to disconnect from the PartySocket', error) };
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
    if (this.#partySocket) {
      return this.#handleDisconnectSocket();
    }

    return this.callWithSession(this.#handleDisconnectSocket.bind(this));
  }
}
