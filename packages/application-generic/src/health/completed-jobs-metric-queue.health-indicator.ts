import { Injectable } from '@nestjs/common';

import { CompletedJobsMetricQueueService } from '../services';
import { QueueHealthIndicator } from './queue-health-indicator.service';

const LOG_CONTEXT = 'CompletedJobsMetricQueueServiceHealthIndicator';
const INDICATOR_KEY = 'completedJobsMetricQueue';
const SERVICE_NAME = 'CompletedJobsMetricQueueService';
@Injectable()
export class CompletedJobsMetricQueueServiceHealthIndicator extends QueueHealthIndicator {
  constructor(
    private completedJobsMetricQueueService: CompletedJobsMetricQueueService
  ) {
    super(
      completedJobsMetricQueueService,
      INDICATOR_KEY,
      SERVICE_NAME,
      LOG_CONTEXT
    );
  }
}
