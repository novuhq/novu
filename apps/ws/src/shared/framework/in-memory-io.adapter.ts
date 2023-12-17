import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisPrefix } from '@novu/shared';
import { WebSocketsInMemoryProviderService } from '@novu/application-generic';

export class InMemoryIoAdapter extends IoAdapter {
  private webSocketsInMemoryProviderService: WebSocketsInMemoryProviderService;
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToInMemoryCluster(): Promise<void> {
    // TODO: Pending to inject in the provider instantiation
    const keyPrefix = getRedisPrefix() ? `socket.io#${getRedisPrefix()}` : 'socket.io';

    this.webSocketsInMemoryProviderService = new WebSocketsInMemoryProviderService();

    await this.webSocketsInMemoryProviderService.initialize();

    const pubClient = this.webSocketsInMemoryProviderService.getClient();
    const subClient = pubClient?.duplicate();

    /*
     *  TODO: Might not be needed to connect as we are checking it is initialized already.
     * await Promise.all([pubClient?.connect(), subClient?.connect()]);
     */
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);

    return server;
  }
}
