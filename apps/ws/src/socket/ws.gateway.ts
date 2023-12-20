const nr = require('newrelic');
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';

import { ISubscriberJwt, ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import { IDestroy } from '@novu/application-generic';

import { SubscriberOnlineService } from '../shared/subscriber-online';

const LOG_CONTEXT = 'WSGateway';

@WebSocketGateway()
export class WSGateway implements OnGatewayConnection, OnGatewayDisconnect, IDestroy {
  private isShutdown = false;

  constructor(private jwtService: JwtService, private subscriberOnlineService: SubscriberOnlineService) {}

  @WebSocketServer()
  server: Server | null;

  async handleDisconnect(connection: Socket) {
    Logger.log(`New disconnect received from ${connection.id}`, LOG_CONTEXT);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;

    return new Promise((resolve, reject) => {
      nr.startBackgroundTransaction(
        ObservabilityBackgroundTransactionEnum.WS_SOCKET_HANDLE_DISCONNECT,
        'WS Service',
        function () {
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

  async handleConnection(connection: Socket) {
    Logger.log(`New connection received from ${connection.id}`, LOG_CONTEXT);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;

    return new Promise((resolve, reject) => {
      nr.startBackgroundTransaction(
        ObservabilityBackgroundTransactionEnum.WS_SOCKET_SOCKET_CONNECTION,
        'WS Service',
        function () {
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

  private extractToken(connection: Socket): string | undefined {
    return connection.handshake.auth?.token || connection.handshake.query?.token;
  }

  private async getSubscriber(token: string): Promise<ISubscriberJwt | undefined> {
    let subscriber: ISubscriberJwt;

    try {
      subscriber = await this.jwtService.verify(token as string);
      if (subscriber.aud !== 'widget_user') {
        return;
      }

      return subscriber;
    } catch (e) {
      return;
    }
  }

  /*
   * This method is called when a client disconnects from the server.
   * * When a shutdown is in progress, we opt out of updating the subscriber status,
   * assuming that when the current instance goes down, another instance will take its place and handle the subscriber status update.
   */
  private async processDisconnectionRequest(connection: Socket) {
    if (!this.isShutdown) {
      await this.handlerSubscriberDisconnection(connection);
    } else {
      Logger.log(`Skipped disconnect due to shutdown flag for connection ${connection.id}`, LOG_CONTEXT);
    }
  }

  private async handlerSubscriberDisconnection(connection: Socket) {
    const token = this.extractToken(connection);

    if (!token || token === 'null') {
      return;
    }

    const subscriber = await this.getSubscriber(token);
    if (!subscriber) {
      return;
    }

    const activeConnections = await this.getActiveConnections(connection, subscriber._id);

    Logger.log(
      `Disconnect request received from ${subscriber._id}. Active connections: ${activeConnections}`,
      LOG_CONTEXT
    );
    await this.subscriberOnlineService.handleDisconnection(subscriber, activeConnections);
  }

  private async getActiveConnections(socket: Socket, subscriberId: string) {
    const activeSockets = await this.server?.in(subscriberId).fetchSockets();

    return activeSockets?.length || 0;
  }

  private async processConnectionRequest(connection: Socket) {
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

    Logger.log(
      `Connection request received from ${subscriber._id} external id: ${subscriber.subscriberId}`,
      LOG_CONTEXT
    );

    await connection.join(subscriber._id);

    Logger.log(`Connection request accepted for ${subscriber._id}`, LOG_CONTEXT);

    await this.subscriberOnlineService.handleConnection(subscriber);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendMessage(userId: string, event: string, data: any) {
    if (!this.server) {
      Logger.error('No sw server available to send message', LOG_CONTEXT);

      return;
    }

    Logger.log(`Sending event ${event} message to ${userId}`, LOG_CONTEXT);

    this.server.to(userId).emit(event, data);
  }

  private disconnect(socket: Socket) {
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
}
