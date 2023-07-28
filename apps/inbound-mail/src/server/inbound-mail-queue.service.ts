import { BullMqService, QueueBaseOptions } from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';

export class InboundMailQueueService {
  public readonly DEFAULT_ATTEMPTS = 5;
  public readonly name = JobTopicNameEnum.INBOUND_PARSE_MAIL;

  private bullConfig: QueueBaseOptions = {
    connection: {
      db: Number(process.env.REDIS_DB_INDEX) ?? 2,
      port: Number(process.env.REDIS_PORT) ?? 6379,
      keyPrefix: process.env.REDIS_PREFIX ?? '',
    },
  };

  constructor(public readonly bullMqService: BullMqService) {
    this.bullMqService.createQueue(this.name, {
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
