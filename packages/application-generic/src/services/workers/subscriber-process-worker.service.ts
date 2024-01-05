import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './worker-base.service';
import { BullMqService } from '../bull-mq';

const LOG_CONTEXT = 'SubscriberProcessWorkerService';

export class SubscriberProcessWorkerService extends WorkerBaseService {
  constructor(private bullMqService: BullMqService) {
    super(JobTopicNameEnum.PROCESS_SUBSCRIBER, bullMqService);
  }
}
