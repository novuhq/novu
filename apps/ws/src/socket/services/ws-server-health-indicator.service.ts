import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';

import { IHealthIndicator } from '@novu/application-generic';

import { WSGateway } from '../ws.gateway';

@Injectable()
export class WSServerHealthIndicator extends HealthIndicator implements IHealthIndicator {
  private static KEY = 'ws-server';

  constructor(private wsGateway: WSGateway) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isHealthy = !!this.wsGateway.server;
    const result = this.getStatus(WSServerHealthIndicator.KEY, isHealthy);

    if (isHealthy) {
      return result;
    }

    throw new HealthCheckError('WS server health check failed', result);
  }

  isActive(): Promise<HealthIndicatorResult> {
    return this.isHealthy();
  }
}
