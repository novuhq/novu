import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

import {
  KEYLESS_DAILY_COUNTER_TTL_SECONDS,
  resolveKeylessAgentTriggerCapPerEnvPerDay,
} from './keyless-abuse.constants';

const REJECTED = -1;

/**
 * Adds `cost` only when the new total stays within the cap, so a rejected
 * request does not burn the remaining daily units.
 */
const INCRBY_WITHIN_CAP_SCRIPT = `
local cost = tonumber(ARGV[1])
local cap = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current + cost > cap then
  return ${REJECTED}
end
local next = redis.call('INCRBY', KEYS[1], cost)
if redis.call('TTL', KEYS[1]) < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[3])
end
return next
`;

export interface KeylessTriggerCapResult {
  allowed: boolean;
  cap: number;
  /** Set when the counter could not be checked, as opposed to the cap being reached. */
  unavailable?: boolean;
}

@Injectable()
export class KeylessTriggerCapService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Fails closed: a counter that cannot be read or written is never treated as under the cap.
   * A cap of 0 is the operator bypass.
   */
  async consume(environmentId: string, cost: number): Promise<KeylessTriggerCapResult> {
    const cap = resolveKeylessAgentTriggerCapPerEnvPerDay();

    if (cap === 0 || cost <= 0) {
      return { allowed: true, cap };
    }

    if (!this.cacheService.cacheEnabled()) {
      return { allowed: false, cap, unavailable: true };
    }

    try {
      const result = await this.cacheService.eval<number>(
        INCRBY_WITHIN_CAP_SCRIPT,
        [this.dailyCounterKey(environmentId)],
        [cost, cap, KEYLESS_DAILY_COUNTER_TTL_SECONDS]
      );

      return { allowed: result !== REJECTED, cap };
    } catch (error) {
      this.logger.warn({ err: error, environmentId }, 'Keyless trigger cap check failed, rejecting the request');

      return { allowed: false, cap, unavailable: true };
    }
  }

  private dailyCounterKey(environmentId: string): string {
    const date = new Date().toISOString().slice(0, 10);

    return `keyless:agent_trigger:${date}:{${environmentId}}`;
  }
}
