import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { QueueBaseService } from './queue-base.service';

import { BullMqService, QueueOptions } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';

const LOG_CONTEXT = 'InboundParseQueueService';

@Injectable()
export class InboundParseQueueService extends QueueBaseService {
  constructor(
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {
    super(
      JobTopicNameEnum.INBOUND_PARSE_MAIL,
      new BullMqService(workflowInMemoryProviderService)
    );

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue(this.getOverrideOptions());
  }

  private getOverrideOptions(): QueueOptions {
    return {
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          delay: 4000,
          type: 'exponential',
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    };
  }
}
