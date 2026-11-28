import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';

import { QueueBaseService } from '../services/queues/queue-base.service';
import { IHealthIndicator, toHealthIndicatorResult } from './health-indicator.interface';

@Injectable()
export abstract class QueueHealthIndicator implements IHealthIndicator {
  constructor(
    private queueService: QueueBaseService,
    private indicatorKey: string,
    private serviceName: string,
    private logContext: string
  ) {}

  async isHealthy(): Promise<HealthIndicatorResult> {
    return await this.handleHealthCheck();
  }

  async handleHealthCheck(): Promise<HealthIndicatorResult> {
    return toHealthIndicatorResult(
      this.indicatorKey,
      this.queueService.isReady(),
      `${this.serviceName} Health is not ready`
    );
  }
}
