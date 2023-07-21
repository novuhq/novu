import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';

import { InMemoryProviderService } from '../services';

@Injectable()
export class InMemoryProviderServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'inMemory';

  constructor(private inMemoryProviderService: InMemoryProviderService) {
    super();
  }

  /**
   * TODO: Think how to check FeatureFlagsService dependency
   * without blocking self hosted users
   */
  async isHealthy(): Promise<HealthIndicatorResult> {
    if (this.inMemoryProviderService?.isClientReady()) {
      return this.getStatus(this.INDICATOR_KEY, true);
    }

    throw new HealthCheckError(
      'In-memory Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
