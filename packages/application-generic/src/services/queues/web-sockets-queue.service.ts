import { Inject, Injectable } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { QueueBaseService } from './index';

@Injectable()
export class WebSocketsQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.WEB_SOCKETS);

    this.createQueue();
  }
}
