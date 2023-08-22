import { Module } from '@nestjs/common';

import {
  readinessService,
  oldInstanceBullMqService,
} from '../custom-providers';
import {
  StandardQueueServiceHealthIndicator,
  WebSocketsQueueServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../health';
import { BullMqService, OldInstanceBullMqService } from '../services';
import {
  StandardQueueService,
  WebSocketsQueueService,
  WorkflowQueueService,
} from '../services/queues';
import {
  JobMetricsWorkerService,
  StandardWorkerService,
  WebSocketsWorkerService,
  WorkflowWorkerService,
  OldInstanceWorkflowWorkerService,
} from '../services/workers';

const PROVIDERS = [
  BullMqService,
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
  oldInstanceBullMqService,
  OldInstanceWorkflowWorkerService,
  OldInstanceBullMqService,
];

@Module({
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class QueuesModule {}
