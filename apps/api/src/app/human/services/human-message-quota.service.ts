import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import { FeatureNameEnum } from '@novu/shared';
import {
  type QuotaWindow,
  quotaWindowKeys,
  TieredWindowQuotaService,
  type TieredWindowQuotaSpec,
  type WindowQuotaCredits,
} from './tiered-window-quota.service';

const KEY_PREFIX = 'human-message';

export type HumanMessageCap = QuotaWindow;

export class HumanMessageQuotaExceededException extends HttpException {
  constructor(cap: HumanMessageCap, limit: number, retryAfterSeconds: number, resetsAt: string) {
    super(
      {
        code: cap === 'daily' ? 'human_message_daily_cap' : 'human_message_monthly_cap',
        message: `Human message ${cap} limit reached (${limit}). Resets at ${resetsAt}.`,
        retryAfterSeconds,
        cap,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}

/**
 * Credits held for one Human send. `accept` records recipients whose delivery
 * succeeded. `release` gives the rest back.
 */
export type HumanMessageCredits = WindowQuotaCredits;

/**
 * Org-wide abuse cap on signed-up Human messages. Same windows as the Agent
 * Email Inbox: a UTC day and a UTC month, read from the tier table.
 */
@Injectable()
export class HumanMessageQuotaService extends TieredWindowQuotaService {
  protected readonly spec: TieredWindowQuotaSpec = {
    keyPrefix: KEY_PREFIX,
    dailyFeature: FeatureNameEnum.HUMAN_MESSAGE_DAILY_LIMIT,
    monthlyFeature: FeatureNameEnum.HUMAN_MESSAGE_MONTHLY_LIMIT,
    logLabel: 'Human message quota',
    exceeded: (cap, limit, retryAfterSeconds, resetsAt) =>
      new HumanMessageQuotaExceededException(cap, limit, retryAfterSeconds, resetsAt),
  };

  constructor(cacheService: CacheService, organizationRepository: CommunityOrganizationRepository, logger: PinoLogger) {
    super(cacheService, organizationRepository, logger);
    this.logger.setContext(this.constructor.name);
  }

  /** Holds one credit per recipient. A bare `accept()` records a single delivery. */
  async reserveCredits(organizationId: string, count: number): Promise<HumanMessageCredits> {
    return this.reserveWindows(organizationId, count, 1);
  }
}

export function humanMessageQuotaKeys(organizationId: string, now: Date): { daily: string; monthly: string } {
  return quotaWindowKeys(KEY_PREFIX, organizationId, now);
}
