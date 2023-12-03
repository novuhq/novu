import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';

const LOG_CONTEXT = 'WorkflowWorkerService';

export class WorkflowWorkerService extends WorkerBaseService {
  constructor(public bullMqService: BullMqService) {
    super(JobTopicNameEnum.WORKFLOW, bullMqService);
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }
}
