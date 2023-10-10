import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { QueueBaseService } from './index';

const LOG_CONTEXT = 'ActiveJobsMetricQueueService';

@Injectable()
export class ActiveJobsMetricQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.ACTIVE_JOBS_METRIC);

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue();
  }
}
