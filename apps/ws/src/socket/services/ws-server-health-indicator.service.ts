import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';

import { IHealthIndicator, toHealthIndicatorResult } from '@novu/application-generic';

import { WSGateway } from '../ws.gateway';

@Injectable()
export class WSServerHealthIndicator implements IHealthIndicator {
  private static KEY = 'ws-server';

  constructor(private wsGateway: WSGateway) {}

  async isHealthy(): Promise<HealthIndicatorResult> {
    return toHealthIndicatorResult(
      WSServerHealthIndicator.KEY,
      !!this.wsGateway.server,
      'WS server health check failed'
    );
  }
}
