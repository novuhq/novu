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
import { OldInstanceBullMqService, ReadinessService } from '../services';
import {
  ActiveJobsMetricQueueService,
  CompletedJobsMetricQueueService,
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
  OldInstanceStandardWorkerService,
  OldInstanceWorkflowWorkerService,
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
  WorkflowQueueServiceHealthIndicator,
  WorkflowWorkerService,
  OldInstanceStandardWorkerService,
  OldInstanceWorkflowWorkerService,
  OldInstanceBullMqService,
  SubscriberProcessQueueService,
  SubscriberProcessWorkerService,
  SubscriberProcessQueueHealthIndicator,
];

@Module({
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class QueuesModule {}
