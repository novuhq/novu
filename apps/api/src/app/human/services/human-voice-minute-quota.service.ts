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

const KEY_PREFIX = 'human-voice-minutes';

export type HumanVoiceMinuteCap = QuotaWindow;

export class HumanVoiceMinuteQuotaExceededException extends HttpException {
  constructor(cap: HumanVoiceMinuteCap, limit: number, retryAfterSeconds: number, resetsAt: string) {
    super(
      {
        code: cap === 'daily' ? 'voice_minutes_daily_cap' : 'voice_minutes_monthly_cap',
        message: `Voice minute ${cap} limit reached (${limit}). Resets at ${resetsAt}.`,
        retryAfterSeconds,
        resetsAt,
        cap,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}

/**
 * Minutes held for one voice send. `accept` records minutes that stay reserved
 * until the interaction settles. `release` gives the rest back.
 */
export type HumanVoiceMinuteCredits = WindowQuotaCredits;

/**
 * Org-wide cap on outbound voice minutes. A call reserves its maximum duration
 * up front; settlement gives the reservation back. NV-9174 will give back only
 * the unused remainder once a real duration exists.
 */
@Injectable()
export class HumanVoiceMinuteQuotaService extends TieredWindowQuotaService {
  protected readonly spec: TieredWindowQuotaSpec = {
    keyPrefix: KEY_PREFIX,
    dailyFeature: FeatureNameEnum.HUMAN_VOICE_MINUTE_DAILY_LIMIT,
    monthlyFeature: FeatureNameEnum.HUMAN_VOICE_MINUTE_MONTHLY_LIMIT,
    logLabel: 'voice minute quota',
    exceeded: (cap, limit, retryAfterSeconds, resetsAt) =>
      new HumanVoiceMinuteQuotaExceededException(cap, limit, retryAfterSeconds, resetsAt),
  };

  constructor(cacheService: CacheService, organizationRepository: CommunityOrganizationRepository, logger: PinoLogger) {
    super(cacheService, organizationRepository, logger);
    this.logger.setContext(this.constructor.name);
  }

  /** A bare `accept()` keeps the whole reservation: a call settles in one piece. */
  async reserveMinutes(organizationId: string, minutes: number): Promise<HumanVoiceMinuteCredits> {
    return this.reserveWindows(organizationId, minutes, minutes);
  }

  /** Gives minutes back to the window they were reserved in. Does not throw. */
  async releaseReserved(organizationId: string, minutes: number, reservedAt: Date): Promise<void> {
    return this.releaseInto(organizationId, minutes, reservedAt);
  }
}

export function humanVoiceMinuteQuotaKeys(organizationId: string, now: Date): { daily: string; monthly: string } {
  return quotaWindowKeys(KEY_PREFIX, organizationId, now);
}
