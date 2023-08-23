import { Module, Provider } from '@nestjs/common';

import {
  bullMqTokenList,
  oldInstanceBullMqService,
} from '../custom-providers';
import {
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

const PROVIDERS: Provider[] = [
  bullMqTokenList,
  BullMqService,
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

if (process.env.MEMORY_DB_CLUSTER_SERVICE_HOST) {
  PROVIDERS.push(oldInstanceBullMqService);
}

@Module({
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class QueuesModule {}
