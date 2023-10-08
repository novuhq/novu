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
import { OldInstanceBullMqService, ReadinessService } from '../services';
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

import { SubscriberProcessQueueService } from '../services/queues/subscriber-process-queue.service';
import { SubscriberProcessWorkerService } from '../services/workers/subscriber-process-worker.service';
import { SubscriberProcessQueueHealthIndicator } from '../health/subscriber-process-queue.health-indicator';

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
