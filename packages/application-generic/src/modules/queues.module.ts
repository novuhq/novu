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

export const workerIndicatorList = {
  provide: 'INDICATOR_LIST',
  useFactory: (
    standardQueueServiceHealthIndicator: StandardQueueServiceHealthIndicator,
    workflowQueueServiceHealthIndicator: WorkflowQueueServiceHealthIndicator,
    subscriberProcessQueueHealthIndicator: SubscriberProcessQueueHealthIndicator
  ) => {
    return [
      standardQueueServiceHealthIndicator,
      workflowQueueServiceHealthIndicator,
      subscriberProcessQueueHealthIndicator,
    ];
  },
  inject: [
    StandardQueueServiceHealthIndicator,
    WorkflowQueueServiceHealthIndicator,
    SubscriberProcessQueueHealthIndicator,
  ],
};

const WORKER_PROVIDERS: Provider[] = [
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
  workerIndicatorList,
  StandardQueueServiceHealthIndicator,
  WebSocketsQueueServiceHealthIndicator,
  SubscriberProcessQueueHealthIndicator,
  ReadinessService,
  StandardQueueService,
  StandardWorkerService,
  WebSocketsQueueService,
  WebSocketsWorkerService,
  WorkflowQueueService,
  ExecutionLogQueueService,
  WorkflowQueueServiceHealthIndicator,
  WorkflowWorkerService,
  SubscriberProcessQueueService,
  SubscriberProcessWorkerService,
];

@Module({
  providers: [...WORKER_PROVIDERS],
  exports: [...WORKER_PROVIDERS],
})
export class QueuesModule {}

const API_PROVIDERS: Provider[] = [
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
  providers: [...API_PROVIDERS],
  exports: [...API_PROVIDERS],
})
export class BaseApiQueuesModule {}
