import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { QueueBaseService } from './index';

const LOG_CONTEXT = 'JobMetricsQueueService';

@Injectable()
export class JobMetricsQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.METRICS);

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue();
  }
}
