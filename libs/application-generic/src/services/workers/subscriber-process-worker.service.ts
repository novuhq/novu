import { JobTopicNameEnum } from '@novu/shared';
import { BullMqService } from '../bull-mq';
import { WorkerBaseService } from './worker-base.service';

const LOG_CONTEXT = 'SubscriberProcessWorkerService';

export class SubscriberProcessWorkerService extends WorkerBaseService {
  constructor(private bullMqService: BullMqService) {
    super(JobTopicNameEnum.PROCESS_SUBSCRIBER, bullMqService);
  }
}
