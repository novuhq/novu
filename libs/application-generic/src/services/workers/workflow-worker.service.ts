import { JobTopicNameEnum } from '@novu/shared';
import { BullMqService } from '../bull-mq';
import { WorkerBaseService } from './worker-base.service';

const LOG_CONTEXT = 'WorkflowWorkerService';

export class WorkflowWorkerService extends WorkerBaseService {
  constructor(public bullMqService: BullMqService) {
    super(JobTopicNameEnum.WORKFLOW, bullMqService);
  }
}
