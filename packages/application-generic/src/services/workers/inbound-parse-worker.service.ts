import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';

import { WorkerBaseService } from './index';
import { BullMqService } from '../bull-mq';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';

const LOG_CONTEXT = 'InboundParseWorkerService';

export class InboundParseWorkerService extends WorkerBaseService {
  constructor(private bullMqService: BullMqService) {
    super(JobTopicNameEnum.INBOUND_PARSE_MAIL, bullMqService);
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }
}
