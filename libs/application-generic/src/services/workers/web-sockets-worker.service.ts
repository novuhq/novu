import { JobTopicNameEnum } from '@novu/shared';
import { BullMqService } from '../bull-mq';
import { WorkerBaseService } from './worker-base.service';

const LOG_CONTEXT = 'WebSocketsWorkerService';

export class WebSocketsWorkerService extends WorkerBaseService {
  constructor(public bullMqService: BullMqService) {
    super(JobTopicNameEnum.WEB_SOCKETS, bullMqService);
  }
}
