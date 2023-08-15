import { Module } from '@nestjs/common';

import { bullMqService, readinessService } from '../custom-providers';
import {
  StandardQueueServiceHealthIndicator,
  WebSocketsQueueServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../health';
import {
  InboundParseQueueService,
  JobMetricsQueueService,
  StandardQueueService,
  WebSocketsQueueService,
  WorkflowQueueService,
} from '../services/queues';
import {
  InboundParseWorkerService,
  JobMetricsWorkerService,
  StandardWorkerService,
  WebSocketsWorkerService,
  WorkflowWorkerService,
} from '../services/workers';

const PROVIDERS = [
  bullMqService,
  readinessService,
  StandardQueueService,
  StandardQueueServiceHealthIndicator,
  StandardWorkerService,
  WebSocketsQueueService,
  WebSocketsQueueServiceHealthIndicator,
  WebSocketsWorkerService,
  WorkflowQueueService,
  WorkflowQueueServiceHealthIndicator,
  WorkflowWorkerService,
];

@Module({
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class QueuesModule {}
