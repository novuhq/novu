import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { JobMetricsQueueService } from '../services';

const LOG_CONTEXT = 'JobMetricsQueueServiceHealthIndicator';

@Injectable()
export class JobMetricsQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'jobMetricsQueue';

  constructor(
    @Inject(JobMetricsQueueService)
    private jobMetricsQueueService: JobMetricsQueueService
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const runningStatus =
      await this.jobMetricsQueueService.bullMqService.getRunningStatus();

    if (!runningStatus.queueIsPaused) {
      Logger.log('JobMetricsQueueService is not paused', LOG_CONTEXT);

      return this.getStatus(this.INDICATOR_KEY, true);
    }

    Logger.log('JobMetricsQueueService is paused', LOG_CONTEXT);

    throw new HealthCheckError(
      'JobMetrics Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
