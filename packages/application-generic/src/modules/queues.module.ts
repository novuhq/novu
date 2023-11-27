import { Module, Provider } from '@nestjs/common';

import { bullMqTokenList } from '../custom-providers';
import {
  ActiveJobsMetricQueueServiceHealthIndicator,
  CompletedJobsMetricQueueServiceHealthIndicator,
  InboundParseQueueServiceHealthIndicator,
  StandardQueueServiceHealthIndicator,
  SubscriberProcessQueueHealthIndicator,
  WebSocketsQueueServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../health';
import { ReadinessService } from '../services';
import {
  ActiveJobsMetricQueueService,
  CompletedJobsMetricQueueService,
  ExecutionLogQueueService,
  InboundParseQueue,
  StandardQueueService,
  SubscriberProcessQueueService,
  WebSocketsQueueService,
  WorkflowQueueService,
} from '../services/queues';
import {
  ActiveJobsMetricWorkerService,
  CompletedJobsMetricWorkerService,
  InboundParseWorker,
  StandardWorkerService,
  SubscriberProcessWorkerService,
  WebSocketsWorkerService,
  WorkflowWorkerService,
} from '../services/workers';

const PROVIDERS: Provider[] = [
  ActiveJobsMetricQueueService,
  ActiveJobsMetricQueueServiceHealthIndicator,
  ActiveJobsMetricWorkerService,
  bullMqTokenList,
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
  ExecutionLogQueueService,
  WorkflowQueueServiceHealthIndicator,
  WorkflowWorkerService,
  SubscriberProcessQueueService,
  SubscriberProcessWorkerService,
  SubscriberProcessQueueHealthIndicator,
];

@Module({
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class QueuesModule {}

const APP_PROVIDERS: Provider[] = [
  InboundParseQueue,
  InboundParseWorker,
  InboundParseQueueServiceHealthIndicator,
  WebSocketsQueueService,
  WebSocketsQueueServiceHealthIndicator,
  WorkflowQueueService,
  ExecutionLogQueueService,
  WorkflowQueueServiceHealthIndicator,
];

@Module({
  providers: [...APP_PROVIDERS],
  exports: [...APP_PROVIDERS],
})
export class BaseApiQueuesModule {}
