import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';

const LOG_CONTEXT = 'ExecutionLogWorkerService';

@Injectable()
export class ExecutionLogWorkerService extends WorkerBaseService {
  constructor() {
    super(JobTopicNameEnum.EXECUTION_LOG);
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }
}
