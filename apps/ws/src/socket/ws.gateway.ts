import { Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { IDestroy } from '@novu/application-generic';
import { ISubscriberJwt, ObservabilityBackgroundTransactionEnum, WebSocketEventEnum } from '@novu/shared';
import { instrument } from '@socket.io/admin-ui';
import { DefaultEventsMap, Server, Socket } from 'socket.io';

import { SubscriberOnlineService } from '../shared/subscriber-online';

const nr = require('newrelic');

const LOG_CONTEXT = 'WSGateway';

// Longer delays overflow setTimeout's 32-bit signed int and fire at once.
const MAX_TIMEOUT_DELAY_MS = 2 ** 31 - 1;

type SubscriberSession = ISubscriberJwt & { exp?: number };

// socket.io's Redis adapter serializes this across instances, so it must stay plain JSON.
type ConnectionData = {
  contextKeys?: string[];
  session?: SubscriberSession;
};

type Connection = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, ConnectionData>;

@WebSocketGateway()
export class WSGateway implements OnGatewayConnection, OnGatewayDisconnect, IDestroy, OnModuleDestroy {
  private isShutdown = false;

  constructor(
    private jwtService: JwtService,
    private subscriberOnlineService: SubscriberOnlineService
  ) {}

  @WebSocketServer()
  server: Server;

  async handleDisconnect(connection: Connection) {
    Logger.debug(`New disconnect received from ${connection.id}`, LOG_CONTEXT);

    const _this = this;

    return new Promise((resolve, reject) => {
      nr.startBackgroundTransaction(
        ObservabilityBackgroundTransactionEnum.WS_SOCKET_HANDLE_DISCONNECT,
        'WS Service',
        function processTask() {
          const transaction = nr.getTransaction();

          _this
            .processDisconnectionRequest(connection)
            .then(resolve)
            .catch(reject)
            .finally(() => {
              transaction.end();
            });
        }
      );
    });
  }

  async handleConnection(connection: Connection) {
    Logger.debug(`New connection received from ${connection.id}`, LOG_CONTEXT);

    const _this = this;

    return new Promise((resolve, reject) => {
      nr.startBackgroundTransaction(
        ObservabilityBackgroundTransactionEnum.WS_SOCKET_SOCKET_CONNECTION,
        'WS Service',
        function processTask() {
          const transaction = nr.getTransaction();

          _this
            .processConnectionRequest(connection)
            .then(resolve)
            .catch(reject)
            .finally(() => {
              transaction.end();
            });
        }
      );
    });
  }

  private extractToken(connection: Connection): string | undefined {
    return connection.handshake.auth?.token || connection.handshake.query?.token;
  }

  private async getSubscriber(token: string): Promise<SubscriberSession | undefined> {
    let subscriber: SubscriberSession;

    try {
      subscriber = await this.jwtService.verify(token as string);
      if (subscriber.aud !== 'widget_user') {
        return;
      }

      return subscriber;
    } catch (e) {
      /* empty */
    }
  }

  /*
   * This method is called when a client disconnects from the server.
   * * When a shutdown is in progress, we opt out of updating the subscriber status,
   * assuming that when the current instance goes down, another instance will take its place and handle the subscriber status update.
   */
  private async processDisconnectionRequest(connection: Connection) {
    if (!this.isShutdown) {
      await this.handlerSubscriberDisconnection(connection);
    } else {
      Logger.log(`Skipped disconnect due to shutdown flag for connection ${connection.id}`, LOG_CONTEXT);
    }
  }

  private async handlerSubscriberDisconnection(connection: Connection) {
    const subscriber = connection.data.session;
    if (!subscriber) {
      return;
    }

    const activeConnections = await this.getActiveConnections(subscriber._id);

    Logger.debug(
      `Disconnect request received from ${subscriber._id}. Active connections: ${activeConnections}`,
      LOG_CONTEXT
    );
    await this.subscriberOnlineService.handleDisconnection(subscriber, activeConnections);
  }

  private async getActiveConnections(subscriberId: string) {
    const activeSockets = await this.server?.in(subscriberId).fetchSockets();

    return activeSockets?.length || 0;
  }

  private async processConnectionRequest(connection: Connection) {
    const token = this.extractToken(connection);

    if (!token || token === 'null') {
      Logger.warn(`No token was found during counnection process for ${connection.id}`, LOG_CONTEXT);

      return this.disconnect(connection);
    }

    const subscriber = await this.getSubscriber(token);
    if (!subscriber) {
      Logger.warn(`No subscriber was found for specified token ${connection.id}`, LOG_CONTEXT);

      return this.disconnect(connection);
    }

    Logger.debug(
      `Connection request received from ${subscriber._id} external id: ${subscriber.subscriberId} organization id: ${subscriber.organizationId}`,
      LOG_CONTEXT
    );

    const contextKeys = subscriber.contextKeys ?? [];

    connection.data.contextKeys = contextKeys;
    connection.data.session = subscriber;

    await connection.join(subscriber._id);
    if (connection.disconnected) {
      return;
    }

    this.scheduleExpiry(connection);

    const contextDisplay = contextKeys.length === 0 ? 'no context' : contextKeys.join(', ');
    Logger.debug(
      `Connection ${connection.id} accepted for ${subscriber._id} with contexts: ${contextDisplay}`,
      LOG_CONTEXT
    );

    await this.subscriberOnlineService.handleConnection(subscriber);
  }

  async sendMessage(userId: string, event: string, data: unknown, contextKeys: string[]) {
    if (!this.server) {
      Logger.error('No sw server available to send message', LOG_CONTEXT);

      return;
    }

    const safeContextKeys = contextKeys ?? [];
    const sockets = await this.server.in(userId).fetchSockets();

    Logger.log(
      `Sending event ${event} to ${userId} with message contexts: ${safeContextKeys.length === 0 ? 'none' : safeContextKeys.join(', ')} (${sockets.length} socket(s))`,
      LOG_CONTEXT
    );

    for (const socket of sockets) {
      const inboxContextKeys = socket.data.contextKeys ?? [];

      if (this.isExactMatch(safeContextKeys, inboxContextKeys)) {
        socket.emit(event, data);
        Logger.debug(
          `Delivered to socket ${socket.id} with inbox contexts: ${inboxContextKeys.length === 0 ? 'none' : inboxContextKeys.join(', ')}`,
          LOG_CONTEXT
        );
      } else {
        Logger.log(
          `Skipped socket ${socket.id} - contexts mismatch. Message: [${safeContextKeys.join(', ') || 'none'}], Inbox: [${inboxContextKeys.join(', ') || 'none'}]`,
          LOG_CONTEXT
        );
      }
    }
  }

  private isExactMatch(messageContextKeys: string[], inboxContextKeys: string[]): boolean {
    if (messageContextKeys.length === 0) {
      return inboxContextKeys.length === 0;
    }

    if (messageContextKeys.length !== inboxContextKeys.length) {
      return false;
    }

    // Order-independent match: all message keys must exist in inbox keys
    return messageContextKeys.every((key) => inboxContextKeys.includes(key));
  }

  private scheduleExpiry(connection: Connection) {
    const exp = connection.data.session?.exp;
    if (!exp) {
      return;
    }

    let timer: NodeJS.Timeout;
    const arm = () => {
      const delay = exp * 1000 - Date.now();
      timer = setTimeout(
        delay > MAX_TIMEOUT_DELAY_MS ? arm : () => this.expireSession(connection),
        Math.min(Math.max(delay, 0), MAX_TIMEOUT_DELAY_MS)
      );
    };

    arm();
    connection.once('disconnect', () => clearTimeout(timer));
  }

  private expireSession(connection: Connection) {
    Logger.debug(`Session expired for connection ${connection.id}`, LOG_CONTEXT);
    connection.emit(WebSocketEventEnum.SESSION_EXPIRED);
    this.disconnect(connection);
  }

  private disconnect(socket: Connection) {
    socket.disconnect();
  }

  async gracefulShutdown(): Promise<void> {
    try {
      if (!this.server) {
        Logger.error('WS server was not initialized while executing shutdown', LOG_CONTEXT);

        return;
      }

      Logger.log('Closing WS server for incoming new connections', LOG_CONTEXT);
      this.server.close();

      Logger.log('Disconnecting active sockets connections', LOG_CONTEXT);
      this.server.sockets.disconnectSockets();
    } catch (e) {
      Logger.error(e, 'Unexpected exception was thrown while graceful shut down was executed', LOG_CONTEXT);
      throw e;
    } finally {
      Logger.log(`Graceful shutdown down has finished`, LOG_CONTEXT);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.isShutdown = true;
    await this.gracefulShutdown();
  }

  afterInit() {
    if (!!process.env.SOCKET_IO_ADMIN_USERNAME && !!process.env.SOCKET_IO_ADMIN_PASSWORD_HASH) {
      // For more information on how to use the admin UI, see https://socket.io/docs/v4/admin-ui/
      instrument(this.server, {
        auth: {
          type: 'basic',
          username: process.env.SOCKET_IO_ADMIN_USERNAME,
          password: process.env.SOCKET_IO_ADMIN_PASSWORD_HASH,
        },
        mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        namespaceName: '/admin',
      });
    }
  }
}
