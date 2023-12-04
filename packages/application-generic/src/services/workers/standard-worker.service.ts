import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';
import { BullMqService } from '../bull-mq';

const LOG_CONTEXT = 'StandardWorkerService';

export class StandardWorkerService extends WorkerBaseService {
  constructor(public bullMqService: BullMqService) {
    super(JobTopicNameEnum.STANDARD, bullMqService);
  }
}
