import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { INovuWorker } from '../readiness';
import { WorkerBaseService } from './worker-base.service';

const LOG_CONTEXT = 'SubscriberProcessWorkerService';

@Injectable()
export class SubscriberProcessWorkerService
  extends WorkerBaseService
  implements INovuWorker
{
  constructor() {
    super(JobTopicNameEnum.PROCESS_SUBSCRIBER);
  }
}
