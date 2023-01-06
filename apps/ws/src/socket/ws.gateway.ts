import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ISubscriberJwt } from '@novu/shared';
import { SubscriberRepository } from '@novu/dal';

@WebSocketGateway()
export class WSGateway implements OnGatewayConnection {
  constructor(private jwtService: JwtService, private subscriberRepository: SubscriberRepository) {}

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
    await this.handleOnlineStatus(subscriber, true);

    connection.on('disconnect', async () => {
      await this.handleOnlineStatus(subscriber, false);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendMessage(userId: string, event: string, data: any) {
    this.server.to(userId).emit(event, data);
  }

  private disconnect(socket: Socket) {
    socket.disconnect();
  }

  private async handleOnlineStatus(subscriber: ISubscriberJwt, isOnline: boolean) {
    await this.subscriberRepository.update(
      { _id: subscriber._id, _organizationId: subscriber.organizationId },
      {
        $set: {
          isOnline,
          lastOnlineAt: new Date(),
        },
      }
    );
  }
}
