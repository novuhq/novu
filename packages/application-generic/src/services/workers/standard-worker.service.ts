import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';

const LOG_CONTEXT = 'StandardWorkerService';

@Injectable()
export class StandardWorkerService extends WorkerBaseService {
  constructor() {
    super(JobTopicNameEnum.STANDARD);
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }
}
