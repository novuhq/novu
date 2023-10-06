import {
  InboundParseQueue,
  InboundParseWorker,
  Queue,
  QueueOptions,
  Worker,
  WorkerOptions,
} from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';
import { Injectable, Logger } from '@nestjs/common';

import { InboundEmailParse } from '../usecases/inbound-email-parse/inbound-email-parse.usecase';
import { InboundEmailParseCommand } from '../usecases/inbound-email-parse/inbound-email-parse.command';

const LOG_CONTEXT = 'InboundParseQueueService';

@Injectable()
export class InboundParseQueueService {
  public readonly queue: Queue;
  public readonly worker: Worker;

  constructor(
    private emailParseUsecase: InboundEmailParse,
    public readonly inboundParseQueue: InboundParseQueue,
    public readonly inboundParseWorker: InboundParseWorker
  ) {
    this.inboundParseQueue.createQueue();
    this.inboundParseWorker.createWorker(this.getWorkerProcessor(), this.getWorkerOptions());
  }

  private getWorkerOptions(): WorkerOptions {
    return {
      lockDuration: 90000,
      concurrency: 200,
    };
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: InboundEmailParseCommand }) => {
      Logger.verbose({ data }, 'Processing the inbound parsed email', LOG_CONTEXT);
      await this.emailParseUsecase.execute(InboundEmailParseCommand.create({ ...data }));
    };
  }
}
