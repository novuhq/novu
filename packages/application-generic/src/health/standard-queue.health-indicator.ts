import { Injectable } from '@nestjs/common';

import { StandardQueueService } from '../services/queues';
import { QueueHealthIndicator } from './queue-health-indicator.service';

const LOG_CONTEXT = 'StandardQueueServiceHealthIndicator';
const INDICATOR_KEY = 'standardQueue';
const SERVICE_NAME = 'StandardQueueService';

@Injectable()
export class StandardQueueServiceHealthIndicator extends QueueHealthIndicator {
  constructor(private standardQueueService: StandardQueueService) {
    super(standardQueueService, INDICATOR_KEY, SERVICE_NAME, LOG_CONTEXT);
  }
}
