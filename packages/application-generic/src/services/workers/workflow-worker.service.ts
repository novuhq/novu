import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';

const LOG_CONTEXT = 'WorkflowWorkerService';

@Injectable()
export class WorkflowWorkerService extends WorkerBaseService {
  constructor() {
    super(JobTopicNameEnum.WORKFLOW);
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }
}
