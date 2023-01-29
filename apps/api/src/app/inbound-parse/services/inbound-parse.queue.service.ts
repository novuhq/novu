import { Queue, QueueBaseOptions, Worker } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { getRedisPrefix } from '@novu/shared';
import { InboundEmailParse } from '../usecases/inbound-email-parse/inbound-email-parse.usecase';
import { InboundEmailParseCommand } from '../usecases/inbound-email-parse/inbound-email-parse.command';
import { ConnectionOptions } from 'tls';

@Injectable()
export class InboundParseQueueService {
  readonly QUEUE_NAME = 'inbound-parse-mail';

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
      tls: process.env.REDIS_TLS as ConnectionOptions,
    },
  };
  public readonly queue: Queue;
  public readonly worker: Worker;

  constructor(private emailParseUsecase: InboundEmailParse) {
    this.queue = new Queue<InboundEmailParseCommand>(this.QUEUE_NAME, {
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
    return async ({ data }: { data: InboundEmailParseCommand }) => {
      await this.emailParseUsecase.execute(InboundEmailParseCommand.create({ ...data }));
    };
  }
}
