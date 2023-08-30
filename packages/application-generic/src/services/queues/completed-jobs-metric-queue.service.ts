import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { QueueBaseService } from './index';

const LOG_CONTEXT = 'CompletedJobsMetricQueueService';

@Injectable()
export class CompletedJobsMetricQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.COMPLETED_JOBS_METRIC);

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue();
  }
}
