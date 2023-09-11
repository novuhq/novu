import { Module, Provider } from '@nestjs/common';

import { bullMqTokenList } from '../custom-providers';
import {
  InboundParseQueueServiceHealthIndicator,
  StandardQueueServiceHealthIndicator,
  WebSocketsQueueServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../health';
import {
  BullMqService,
  OldInstanceBullMqService,
  ReadinessService,
} from '../services';
import {
  InboundParseQueue,
  StandardQueueService,
  WebSocketsQueueService,
  WorkflowQueueService,
} from '../services/queues';
import {
  InboundParseWorker,
  JobMetricsWorkerService,
  StandardWorkerService,
  WebSocketsWorkerService,
  WorkflowWorkerService,
  OldInstanceWorkflowWorkerService,
} from '../services/workers';

const PROVIDERS: Provider[] = [
  bullMqTokenList,
  BullMqService,
  InboundParseQueue,
  InboundParseWorker,
  InboundParseQueueServiceHealthIndicator,
  ReadinessService,
  StandardQueueService,
  StandardQueueServiceHealthIndicator,
  StandardWorkerService,
  WebSocketsQueueService,
  WebSocketsQueueServiceHealthIndicator,
  WebSocketsWorkerService,
  WorkflowQueueService,
  WorkflowQueueServiceHealthIndicator,
  WorkflowWorkerService,
  OldInstanceWorkflowWorkerService,
  OldInstanceBullMqService,
];

@Module({
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class QueuesModule {}
