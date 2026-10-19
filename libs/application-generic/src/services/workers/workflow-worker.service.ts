import { JobTopicNameEnum } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { BullMqService } from '../bull-mq';
import { SqsService } from '../sqs';
import { WorkerBaseService } from './worker-base.service';

const LOG_CONTEXT = 'WorkflowWorkerService';

export class WorkflowWorkerService extends WorkerBaseService {
  constructor(bullMqService: BullMqService, sqsService?: SqsService, logger?: PinoLogger) {
    super(JobTopicNameEnum.WORKFLOW, bullMqService, sqsService, logger);
  }
}
