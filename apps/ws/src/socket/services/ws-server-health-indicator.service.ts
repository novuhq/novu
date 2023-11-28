import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';

import { IHealthIndicator } from '@novu/application-generic';

import { WSGateway } from '../ws.gateway';

@Injectable()
export class WSServerHealthIndicator extends HealthIndicator implements IHealthIndicator {
  private INDICATOR_KEY = 'ws-server';

  constructor(private wsGateway: WSGateway) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const status = !!this.wsGateway.server;

    return this.getStatus(this.INDICATOR_KEY, status);
  }

  isActive(): Promise<HealthIndicatorResult> {
    return this.isHealthy();
  }
}
