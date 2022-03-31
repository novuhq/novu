import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ISubscriberJwt } from '@novu/shared';

@WebSocketGateway()
export class WSGateway implements OnGatewayConnection {
  constructor(private jwtService: JwtService) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(connection: Socket) {
    const { token } = connection.handshake.query;

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

    return await connection.join(subscriber._id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendMessage(userId: string, event: string, data: any) {
    this.server.to(userId).emit(event, data);
  }

  private disconnect(socket: Socket) {
    socket.disconnect();
  }
}
