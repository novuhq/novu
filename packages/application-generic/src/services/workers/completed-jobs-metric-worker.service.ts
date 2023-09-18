import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';

const LOG_CONTEXT = 'CompletedJobsMetricWorkerService';

@Injectable()
export class CompletedJobsMetricWorkerService extends WorkerBaseService {
  constructor() {
    super(JobTopicNameEnum.COMPLETED_JOBS_METRIC);
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }
}
