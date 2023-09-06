import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';

const LOG_CONTEXT = 'WebSocketsWorkerService';

@Injectable()
export class WebSocketsWorkerService extends WorkerBaseService {
  constructor() {
    super(JobTopicNameEnum.WEB_SOCKETS);
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }
}
