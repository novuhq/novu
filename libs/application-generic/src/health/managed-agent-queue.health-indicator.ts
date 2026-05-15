import { Injectable } from '@nestjs/common';

import { ManagedAgentQueueService } from '../services/queues';
import { QueueHealthIndicator } from './queue-health-indicator.service';

const LOG_CONTEXT = 'ManagedAgentQueueHealthIndicator';
const INDICATOR_KEY = 'managedAgentQueueService';
const SERVICE_NAME = 'ManagedAgentQueueService';

@Injectable()
export class ManagedAgentQueueHealthIndicator extends QueueHealthIndicator {
  constructor(private managedAgentQueueService: ManagedAgentQueueService) {
    super(managedAgentQueueService, INDICATOR_KEY, SERVICE_NAME, LOG_CONTEXT);
  }
}
