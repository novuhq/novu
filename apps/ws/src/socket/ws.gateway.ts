import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ISubscriberJwt } from '@novu/shared';
import { SubscriberOnlineService } from '../shared/subscriber-online';

@WebSocketGateway()
export class WSGateway implements OnGatewayConnection {
  constructor(private jwtService: JwtService, private subscriberOnlineService: SubscriberOnlineService) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(connection: Socket) {
    const token = connection.handshake.auth?.token || connection.handshake.query?.token;

    if (!token || token === 'null') {
      return this.disconnect(connection);
    }

    let subscriber: ISubscriberJwt;

    try {
      subscriber = await this.jwtService.verify(token as string);
      if (subscriber.aud !== 'widget_user') {
        return this.disconnect(connection);
      }
    } catch (e) {
      return this.disconnect(connection);
    }

    await connection.join(subscriber._id);
    await this.subscriberOnlineService.handleConnection(subscriber);

    connection.on('disconnect', async () => {
      const activeConnections = await this.getActiveConnections(connection, subscriber._id);
      await this.subscriberOnlineService.handleDisconnection(subscriber, activeConnections);
    });
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
