import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable, Logger } from '@nestjs/common';

import { QueueBaseService } from '../services';
import { IHealthIndicator } from './health-indicator.interface';

@Injectable()
export abstract class QueueHealthIndicator
  extends HealthIndicator
  implements IHealthIndicator
{
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

  async isActive(): Promise<HealthIndicatorResult> {
    return await this.handleHealthCheck(true);
  }

  async handleHealthCheck(checkActive = false) {
    const isReady = this.queueService.isReady();

    if (!isReady) {
      Logger.verbose(`${this.serviceName} is not ready`, this.logContext);

      throw new HealthCheckError(
        `${this.serviceName} Health is not ready`,
        this.getStatus(this.indicatorKey, false)
      );
    }

    if (!checkActive) {
      Logger.verbose(`${this.serviceName} is ready`, this.logContext);

      return this.getStatus(this.indicatorKey, true);
    }

    const isPaused = await this.queueService.isPaused();
    const isActive = isReady && !isPaused;

    if (!isActive) {
      Logger.verbose(`${this.serviceName} is not active`, this.logContext);

      throw new HealthCheckError(
        `${this.serviceName} Health is not active`,
        this.getStatus(this.indicatorKey, false)
      );
    }

    Logger.verbose(`${this.serviceName} is active`, this.logContext);

    return this.getStatus(this.indicatorKey, true);
  }
}
