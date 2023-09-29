import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';

const LOG_CONTEXT = 'ActiveJobsMetricWorkerService';

@Injectable()
export class ActiveJobsMetricWorkerService extends WorkerBaseService {
  constructor() {
    super(JobTopicNameEnum.ACTIVE_JOBS_METRIC);
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }
}
