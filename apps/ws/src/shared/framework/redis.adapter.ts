import { IoAdapter } from '@nestjs/platform-socket.io';
import * as redisIoAdapter from 'socket.io-redis';

export class RedisIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    const redisAdapter = redisIoAdapter({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    });

    server.adapter(redisAdapter);
    return server;
  }
}
