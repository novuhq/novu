import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { QueueBaseService } from './index';

const LOG_CONTEXT = 'StandardQueueService';

@Injectable()
export class StandardQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.STANDARD);

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue();
  }
}
