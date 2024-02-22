import { Connection, ConnectOptions } from 'mongoose';
import * as mongoose from 'mongoose';

export class DalService {
  connection: Connection;

  async connect(url: string, config: ConnectOptions = {}) {
    const baseConfig: ConnectOptions = {
      maxPoolSize: +process.env.MONGO_MAX_POOL_SIZE || 500,
      minPoolSize: +process.env.MONGO_MIN_POOL_SIZE || 10,
      autoIndex: process.env.AUTO_CREATE_INDEXES === 'true',
      maxIdleTimeMS: 1000 * 60 * 10,
    };

    const instance = await mongoose.connect(url, {
      ...baseConfig,
      ...config,
    });

    this.connection = instance.connection;

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
