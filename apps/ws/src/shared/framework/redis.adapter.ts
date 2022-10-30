import { IoAdapter } from '@nestjs/platform-socket.io';
import * as redisIoAdapter from 'socket.io-redis';
import { getRedisPrefix } from '@novu/shared';

export class RedisIoAdapter extends IoAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    const redisAdapter = redisIoAdapter({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      prefix: () => {
        // if custom prefix is empty ensure that the default prefix is set
        let prefix = 'socket.io';
        if (getRedisPrefix()) {
          prefix += '#' + getRedisPrefix();
        }

        return prefix;
      },
    });

    server.adapter(redisAdapter);

    return server;
  }
}
