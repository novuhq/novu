import { Queue } from 'bullmq';
import { ConnectionOptions } from 'tls';

export class TestingQueueService {
  public queue: Queue;

  constructor(name: string) {
    this.queue = new Queue(name, {
      connection: {
        db: Number(process.env.REDIS_DB_INDEX || '1'),
        port: Number(process.env.REDIS_PORT || 6379),
        host: process.env.REDIS_HOST,
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 50000,
        keepAlive: 30000,
        tls: process.env.REDIS_TLS as ConnectionOptions,
      },
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });

    if (process.env.NODE_ENV === 'test' && !process.env.CI) {
      this.queue.obliterate({ force: true });
    }
  }
}
