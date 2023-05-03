import { BullmqService } from '@novu/application-generic';
import { Queue, QueueBaseOptions } from 'bullmq';
import { ConnectionOptions } from 'tls';

export class QueueService {
  readonly DEFAULT_ATTEMPTS = 5;
  readonly QUEUE_NAME = 'inbound-parse-mail';

  private bullConfig: QueueBaseOptions = {
    connection: {
      db: Number(process.env.REDIS_DB_INDEX) ?? 2,
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT) ?? 6379,
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 50000,
      keepAlive: 30000,
      family: 4,
      keyPrefix: process.env.REDIS_PREFIX ?? '',
      tls: process.env.REDIS_TLS as ConnectionOptions,
    },
  };
  public readonly bullMqService: BullmqService;

  constructor() {
    this.bullMqService = new BullmqService();
    this.bullMqService.createQueue(this.QUEUE_NAME, {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: this.DEFAULT_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: 4000,
        },
      },
    });
  }
}
