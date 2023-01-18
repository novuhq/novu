import { Queue, QueueBaseOptions, Worker } from 'bullmq';

export class QueueService {
  private bullConfig: QueueBaseOptions = {
    connection: {
      db: Number(process.env.REDIS_DB_INDEX),
      port: Number(process.env.REDIS_PORT),
      host: process.env.REDIS_HOST,
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 50000,
      keepAlive: 30000,
      family: 4,
      keyPrefix: process.env.REDIS_PREFIX ?? '',
    },
  };
  public readonly queue: Queue;
  public readonly worker: Worker;

  constructor() {
    this.queue = new Queue<string>('inbound-mail', {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });
  }
}
