import { Logger } from '@nestjs/common';
import mongoose, { Connection, ConnectOptions } from 'mongoose';
import { AuthMechanism } from './types';

const MONGODB_CONTEXT = '[@novu/dal]';

export { mongoose };

export class DalService {
  connection: Connection;

  async connect(url: string, config: ConnectOptions = {}) {
    const baseConfig: ConnectOptions = {
      autoIndex: process.env.MONGO_AUTO_CREATE_INDEXES === 'true',
      maxIdleTimeMS: process.env.MONGO_MAX_IDLE_TIME_IN_MS ? Number(process.env.MONGO_MAX_IDLE_TIME_IN_MS) : 1000 * 30,
      maxPoolSize: process.env.MONGO_MAX_POOL_SIZE ? Number(process.env.MONGO_MAX_POOL_SIZE) : 50,
      minPoolSize: process.env.MONGO_MIN_POOL_SIZE ? Number(process.env.MONGO_MIN_POOL_SIZE) : 10,
      authMechanism: (process.env.MONGO_AUTH_MECHANISM as AuthMechanism) || ('DEFAULT' as AuthMechanism),
    };

    const finalConfig = {
      ...baseConfig,
      ...config,
    };
    const instance = await mongoose.connect(url, finalConfig);

    this.connection = instance.connection;

    mongoose.connection.on('connected', () => Logger.debug('[@novu/dal]: Mongo connected', MONGODB_CONTEXT));
    mongoose.connection.on('disconnected', () => Logger.debug('[@novu/dal]: Mongo disconnected', MONGODB_CONTEXT));
    mongoose.connection.on('error', (err) =>
      Logger.error(`[@novu/dal]: Mongo error: ${err.message}`, MONGODB_CONTEXT, {
        cause: err,
        stack: err.stack,
      })
    );

    return this.connection;
  }

  isConnected(): boolean {
    return this.connection && this.connection.readyState === 1;
  }

  async disconnect() {
    await mongoose.disconnect();
  }

  async destroy() {
    if (process.env.NODE_ENV !== 'test') throw new Error('Allowed only in test mode');

    await mongoose.connection.dropDatabase();
  }
}
