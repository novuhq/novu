import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { INovuWorker } from '../readiness';
import { WorkerBaseService } from './worker-base.service';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';

const LOG_CONTEXT = 'SubscriberProcessWorkerService';

export class SubscriberProcessWorkerService
  extends WorkerBaseService
  implements INovuWorker
{
  constructor(private bullMqService: BullMqService) {
    super(JobTopicNameEnum.PROCESS_SUBSCRIBER, bullMqService);
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }
}
