import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable, Logger } from '@nestjs/common';

import { CompletedJobsMetricQueueService } from '../services';

const LOG_CONTEXT = 'CompletedJobsMetricQueueServiceHealthIndicator';

@Injectable()
export class CompletedJobsMetricQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'completedJobsMetricQueue';

  constructor(
    private completedJobsMetricQueueService: CompletedJobsMetricQueueService
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isReady = this.completedJobsMetricQueueService.isReady();

    if (isReady) {
      Logger.verbose('CompletedJobsMetricQueueService is ready', LOG_CONTEXT);

      return this.getStatus(this.INDICATOR_KEY, true);
    }

    Logger.verbose('CompletedJobsMetricQueueService is not ready', LOG_CONTEXT);

    throw new HealthCheckError(
      'CompletedJobsMetric Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
