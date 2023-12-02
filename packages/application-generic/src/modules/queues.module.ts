import { Module, Provider } from '@nestjs/common';

import { bullMqTokenList } from '../custom-providers';
import {
  ActiveJobsMetricQueueServiceHealthIndicator,
  InboundParseQueueServiceHealthIndicator,
  StandardQueueServiceHealthIndicator,
  SubscriberProcessQueueHealthIndicator,
  WebSocketsQueueServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../health';
import { ReadinessService, WorkflowInMemoryProviderService } from '../services';
import {
  ActiveJobsMetricQueueService,
  ExecutionLogQueueService,
  InboundParseQueueService,
  StandardQueueService,
  SubscriberProcessQueueService,
  WebSocketsQueueService,
  WorkflowQueueService,
} from '../services/queues';
import {
  ActiveJobsMetricWorkerService,
  InboundParseWorker,
  StandardWorkerService,
  SubscriberProcessWorkerService,
  WebSocketsWorkerService,
  WorkflowWorkerService,
} from '../services/workers';

const memoryQueueService = {
  provide: WorkflowInMemoryProviderService,
  useFactory: async () => {
    const memoryService = new WorkflowInMemoryProviderService();

    await memoryService.initialize();

    return memoryService;
  },
};

const PROVIDERS: Provider[] = [
  memoryQueueService,
  ActiveJobsMetricQueueService,
  ActiveJobsMetricQueueServiceHealthIndicator,
  ActiveJobsMetricWorkerService,
  bullMqTokenList,
  InboundParseQueueService,
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
  memoryQueueService,
  InboundParseQueueService,
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
