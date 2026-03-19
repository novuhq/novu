import { JobTopicNameEnum } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { BullMqService } from '../bull-mq';
import { SqsService } from '../sqs';
import { WorkerBaseService } from './worker-base.service';

const LOG_CONTEXT = 'StandardWorkerService';

export class StandardWorkerService extends WorkerBaseService {
  constructor(bullMqService: BullMqService, sqsService?: SqsService, logger?: PinoLogger) {
    super(JobTopicNameEnum.STANDARD, bullMqService, sqsService, logger);
  }
}
