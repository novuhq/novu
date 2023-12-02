import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';

const LOG_CONTEXT = 'WebSocketsWorkerService';

export class WebSocketsWorkerService extends WorkerBaseService {
  constructor(public bullMqService: BullMqService) {
    super(JobTopicNameEnum.WEB_SOCKETS, bullMqService);
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }
}
