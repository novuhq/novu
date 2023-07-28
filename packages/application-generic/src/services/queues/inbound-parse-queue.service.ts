import { Inject, Injectable } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { QueueBaseService } from './index';

@Injectable()
export class InboundParseQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.INBOUND_PARSE_MAIL);

    this.createQueue();
  }
}
