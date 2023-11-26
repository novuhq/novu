import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { QueueBaseService } from './queue-base.service';

const LOG_CONTEXT = 'ExecutionLogQueueService';

@Injectable()
export class ExecutionLogQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.EXECUTION_LOG);

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue();
  }
}
