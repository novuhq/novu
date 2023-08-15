import { Inject, Injectable } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { QueueBaseService } from './index';

@Injectable()
export class JobMetricsQueueService extends QueueBaseService {
  constructor() {
    super(JobTopicNameEnum.METRICS);

    this.createQueue();
  }
}
