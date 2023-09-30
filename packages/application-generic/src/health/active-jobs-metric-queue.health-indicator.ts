import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable, Logger } from '@nestjs/common';

import { ActiveJobsMetricQueueService } from '../services';

const LOG_CONTEXT = 'ActiveJobsMetricQueueServiceHealthIndicator';

@Injectable()
export class ActiveJobsMetricQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'activeJobsMetricQueue';

  constructor(
    private activeJobsMetricQueueService: ActiveJobsMetricQueueService
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isReady = this.activeJobsMetricQueueService.isReady();

    if (isReady) {
      Logger.verbose('ActiveJobsMetricQueueService is ready', LOG_CONTEXT);

      return this.getStatus(this.INDICATOR_KEY, true);
    }

    Logger.verbose('ActiveJobsMetricQueueService is not ready', LOG_CONTEXT);

    throw new HealthCheckError(
      'ActiveJobsMetric Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
