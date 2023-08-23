import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable, Logger } from '@nestjs/common';

import { JobMetricsQueueService } from '../services';

const LOG_CONTEXT = 'JobMetricsQueueServiceHealthIndicator';

@Injectable()
export class JobMetricsQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'jobMetricsQueue';

  constructor(private jobMetricsQueueService: JobMetricsQueueService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isReady = this.jobMetricsQueueService.isReady();

    if (isReady) {
      Logger.verbose('JobMetricsQueueService is ready', LOG_CONTEXT);

      return this.getStatus(this.INDICATOR_KEY, true);
    }

    Logger.verbose('JobMetricsQueueService is not ready', LOG_CONTEXT);

    throw new HealthCheckError(
      'JobMetrics Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
