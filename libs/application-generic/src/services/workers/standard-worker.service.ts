import { JobTopicNameEnum } from '@novu/shared';
import { BullMqService } from '../bull-mq';
import { WorkerBaseService } from './worker-base.service';

const LOG_CONTEXT = 'StandardWorkerService';

export class StandardWorkerService extends WorkerBaseService {
  constructor(public bullMqService: BullMqService) {
    super(JobTopicNameEnum.STANDARD, bullMqService);
  }
}
