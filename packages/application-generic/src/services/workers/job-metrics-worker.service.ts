import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';

const LOG_CONTEXT = 'JobMetricsWorkerService';

@Injectable()
export class JobMetricsWorkerService extends WorkerBaseService {
  constructor() {
    super(JobTopicNameEnum.METRICS);
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }
}
