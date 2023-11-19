const nr = require('newrelic');

import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ISubscriberJwt, ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import { SubscriberOnlineService } from '../shared/subscriber-online';

@WebSocketGateway()
export class WSGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private jwtService: JwtService, private subscriberOnlineService: SubscriberOnlineService) {}

  @WebSocketServer()
  server: Server;

  async handleDisconnect(connection: Socket) {
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

  private async processDisconnectionRequest(connection: Socket) {
    const token = this.extractToken(connection);

    if (!token || token === 'null') {
      return;
    }

    const subscriber = await this.getSubscriber(token);
    if (!subscriber) {
      return;
    }

    const activeConnections = await this.getActiveConnections(connection, subscriber._id);
    await this.subscriberOnlineService.handleDisconnection(subscriber, activeConnections);
  }

  private async processConnectionRequest(connection: Socket) {
    const token = this.extractToken(connection);

    if (!token || token === 'null') {
      return this.disconnect(connection);
    }

    const subscriber = await this.getSubscriber(token);
    if (!subscriber) {
      return this.disconnect(connection);
    }

    await connection.join(subscriber._id);
    await this.subscriberOnlineService.handleConnection(subscriber);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendMessage(userId: string, event: string, data: any) {
    this.server.to(userId).emit(event, data);
  }

  private disconnect(socket: Socket) {
    socket.disconnect();
  }

  private async getActiveConnections(socket: Socket, subscriberId: string) {
    const activeSockets = await socket.in(subscriberId).fetchSockets();

    return activeSockets.length;
  }
}
