import { JobTopicNameEnum } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { BullMqService } from '../bull-mq';
import { SqsService } from '../sqs';
import { WorkerBaseService } from './worker-base.service';

const LOG_CONTEXT = 'WebSocketsWorkerService';

export class WebSocketsWorkerService extends WorkerBaseService {
  constructor(bullMqService: BullMqService, sqsService?: SqsService, logger?: PinoLogger) {
    super(JobTopicNameEnum.WEB_SOCKETS, bullMqService, sqsService, logger);
  }
}
