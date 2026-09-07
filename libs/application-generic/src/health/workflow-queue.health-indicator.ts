import { Injectable } from '@nestjs/common';

import { WorkflowQueueService } from '../services/queues';
import { QueueHealthIndicator } from './queue-health-indicator.service';

const LOG_CONTEXT = 'WorkflowQueueServiceHealthIndicator';
const INDICATOR_KEY = 'workflowQueue';
const SERVICE_NAME = 'WorkflowQueueService';

@Injectable()
export class WorkflowQueueServiceHealthIndicator extends QueueHealthIndicator {
  constructor(private workflowQueueService: WorkflowQueueService) {
    super(workflowQueueService, INDICATOR_KEY, SERVICE_NAME, LOG_CONTEXT);
  }
}
