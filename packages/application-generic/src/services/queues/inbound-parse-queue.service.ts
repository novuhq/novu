import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { QueueBaseService } from './index';

import { QueueOptions } from '../bull-mq';

const LOG_CONTEXT = 'InboundParseQueueService';

@Injectable()
export class InboundParseQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.INBOUND_PARSE_MAIL);

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
