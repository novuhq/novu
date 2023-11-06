import { Injectable } from '@nestjs/common';

import { ActiveJobsMetricQueueService } from '../services/queues';
import { QueueHealthIndicator } from './queue-health-indicator.service';

const LOG_CONTEXT = 'ActiveJobsMetricQueueServiceHealthIndicator';
const INDICATOR_KEY = 'activeJobsMetricQueue';
const SERVICE_NAME = 'ActiveJobsMetricQueueService';

@Injectable()
export class ActiveJobsMetricQueueServiceHealthIndicator extends QueueHealthIndicator {
  constructor(
    private activeJobsMetricQueueService: ActiveJobsMetricQueueService
  ) {
    super(
      activeJobsMetricQueueService,
      INDICATOR_KEY,
      SERVICE_NAME,
      LOG_CONTEXT
    );
  }
}
