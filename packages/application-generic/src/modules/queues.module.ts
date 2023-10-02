import { Module, Provider } from '@nestjs/common';

import { bullMqTokenList } from '../custom-providers';
import {
  ActiveJobsMetricQueueServiceHealthIndicator,
  CompletedJobsMetricQueueServiceHealthIndicator,
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
  ActiveJobsMetricQueueService,
  CompletedJobsMetricQueueService,
  InboundParseQueue,
  StandardQueueService,
  WebSocketsQueueService,
  WorkflowQueueService,
} from '../services/queues';
import {
  ActiveJobsMetricWorkerService,
  CompletedJobsMetricWorkerService,
  InboundParseWorker,
  StandardWorkerService,
  WebSocketsWorkerService,
  WorkflowWorkerService,
  OldInstanceStandardWorkerService,
  OldInstanceWorkflowWorkerService,
} from '../services/workers';

const PROVIDERS: Provider[] = [
  ActiveJobsMetricQueueService,
  ActiveJobsMetricQueueServiceHealthIndicator,
  ActiveJobsMetricWorkerService,
  bullMqTokenList,
  BullMqService,
  CompletedJobsMetricQueueService,
  CompletedJobsMetricQueueServiceHealthIndicator,
  CompletedJobsMetricWorkerService,
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
  OldInstanceStandardWorkerService,
  OldInstanceWorkflowWorkerService,
  OldInstanceBullMqService,
];

@Module({
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class QueuesModule {}
