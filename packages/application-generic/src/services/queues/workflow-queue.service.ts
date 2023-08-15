import { Inject, Injectable } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { QueueBaseService } from './index';

@Injectable()
export class WorkflowQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.WORKFLOW);

    this.createQueue();
  }
}
