import { Connection, ConnectOptions } from 'mongoose';
import * as mongoose from 'mongoose';

export class DalService {
  connection: Connection;

  async connect(url: string, config: ConnectOptions = {}) {
    const baseConfig: ConnectOptions = {
      maxPoolSize: 700,
      minPoolSize: process.env.NODE_ENV === 'prod' ? 500 : 10,
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
    if (!['test', 'regression'].includes(process.env.NODE_ENV)) throw new Error('Allowed only in test mode');

    await mongoose.connection.dropDatabase();
  }
}
