import { Inject, Injectable } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { QueueBaseService } from './index';

@Injectable()
export class StandardQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.STANDARD);

    this.createQueue();
  }
}
