import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';

const LOG_CONTEXT = 'InboundParseWorkerService';

@Injectable()
export class InboundParseWorkerService extends WorkerBaseService {
  constructor() {
    super(JobTopicNameEnum.INBOUND_PARSE_MAIL);
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }
}
