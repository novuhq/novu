import { Queue, Worker, WorkerOptions } from 'bullmq';
import { BullMqService } from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';
import { Injectable } from '@nestjs/common';

import { InboundEmailParse } from '../usecases/inbound-email-parse/inbound-email-parse.usecase';
import { InboundEmailParseCommand } from '../usecases/inbound-email-parse/inbound-email-parse.command';

@Injectable()
export class InboundParseQueueService {
  readonly name = JobTopicNameEnum.INBOUND_PARSE_MAIL;

  public readonly queue: Queue;
  public readonly worker: Worker;
  private readonly bullMqService: BullMqService;

  constructor(private emailParseUsecase: InboundEmailParse) {
    this.bullMqService = new BullMqService();
    this.queue = this.bullMqService.createQueue(this.name, {
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });

    this.worker = this.bullMqService.createWorker(
      JobTopicNameEnum.INBOUND_PARSE_MAIL,
      this.getWorkerProcessor(),
      this.getWorkerOpts()
    );
  }

  private getWorkerOpts(): WorkerOptions {
    return {
      lockDuration: 90000,
      concurrency: 200,
    };
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: InboundEmailParseCommand }) => {
      await this.emailParseUsecase.execute(InboundEmailParseCommand.create({ ...data }));
    };
  }
}
