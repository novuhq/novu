import { Queue, QueueBaseOptions, Worker } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { getRedisPrefix } from '@novu/shared';
import { EmailParse } from '../usecases/email-parse/email-parse.usecase';
import { EmailParseCommand } from '../usecases/email-parse/email-parse.command';

@Injectable()
export class InboundParseQueueService {
  readonly QUEUE_NAME = 'inbound-mail';

  private bullConfig: QueueBaseOptions = {
    connection: {
      db: Number(process.env.REDIS_DB_INDEX),
      port: Number(process.env.REDIS_PORT),
      host: process.env.REDIS_HOST,
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 50000,
      keepAlive: 30000,
      family: 4,
      keyPrefix: getRedisPrefix(),
    },
  };
  public readonly queue: Queue;
  public readonly worker: Worker;

  constructor(private emailParseUsecase: EmailParse) {
    this.queue = new Queue<EmailParseCommand>(this.QUEUE_NAME, {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });

    this.worker = new Worker(this.QUEUE_NAME, this.getWorkerProcessor(), this.getWorkerOpts());
  }

  private getWorkerOpts() {
    return {
      ...this.bullConfig,
      lockDuration: 90000,
      concurrency: 50,
    };
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: EmailParseCommand }) => {
      await this.emailParseUsecase.execute(EmailParseCommand.create({ ...data }));
    };
  }
}
