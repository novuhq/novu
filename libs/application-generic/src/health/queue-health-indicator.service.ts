import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

import { QueueBaseService } from '../services/queues/queue-base.service';
import { IHealthIndicator } from './health-indicator.interface';

@Injectable()
export abstract class QueueHealthIndicator extends HealthIndicator implements IHealthIndicator {
  constructor(
    private queueService: QueueBaseService,
    private indicatorKey: string,
    private serviceName: string,
    private logContext: string
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    return await this.handleHealthCheck();
  }

  async handleHealthCheck() {
    const isReady = this.queueService.isReady();
    const result = this.getStatus(this.indicatorKey, isReady);

    if (isReady) {
      return result;
    }

    throw new HealthCheckError(`${this.serviceName} Health is not ready`, result);
  }
}
