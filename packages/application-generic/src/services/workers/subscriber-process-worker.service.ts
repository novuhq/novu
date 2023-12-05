import { JobTopicNameEnum } from '@novu/shared';

import { INovuWorker } from '../readiness';
import { WorkerBaseService } from './worker-base.service';
import { BullMqService } from '../bull-mq';

const LOG_CONTEXT = 'SubscriberProcessWorkerService';

export class SubscriberProcessWorkerService
  extends WorkerBaseService
  implements INovuWorker
{
  constructor(private bullMqService: BullMqService) {
    super(JobTopicNameEnum.PROCESS_SUBSCRIBER, bullMqService);
  }
}
