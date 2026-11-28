import { HealthIndicatorResult } from '@nestjs/terminus';

export interface IHealthIndicator {
  isHealthy(): Promise<HealthIndicatorResult>;
}

/**
 * Builds the same result as Terminus' `HealthIndicatorService.check(key).up()/.down()`.
 * A `down` result fails `HealthCheckService.check()` without throwing, which replaces
 * the `HealthIndicator` + `HealthCheckError` API removed in @nestjs/terminus 12.
 */
export function toHealthIndicatorResult(key: string, isHealthy: boolean, message?: string): HealthIndicatorResult {
  if (isHealthy) {
    return { [key]: { status: 'up' } };
  }

  return { [key]: { status: 'down', ...(message ? { message } : {}) } };
}
