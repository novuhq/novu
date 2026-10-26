import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsNumber } from '@novu/shared';

const DAY_TTL_BUFFER_SECONDS = 60 * 60;
const MONTH_TTL_BUFFER_SECONDS = 24 * 60 * 60;

/**
 * Check both windows before either increment so a monthly rejection cannot
 * leave a daily hold. INCRBY + EXPIRE stay inside this script so two
 * reservations at the boundary cannot both pass.
 */
const RESERVE_SCRIPT = `
local count = tonumber(ARGV[1])
local dailyLimit = tonumber(ARGV[2])
local monthlyLimit = tonumber(ARGV[3])
local dailyTtl = tonumber(ARGV[4])
local monthlyTtl = tonumber(ARGV[5])
local daily = tonumber(redis.call('GET', KEYS[1]) or '0')
local monthly = tonumber(redis.call('GET', KEYS[2]) or '0')
if daily + count > dailyLimit then
  return 'daily'
end
if monthly + count > monthlyLimit then
  return 'monthly'
end
local newDaily = redis.call('INCRBY', KEYS[1], count)
if newDaily == count then
  redis.call('EXPIRE', KEYS[1], dailyTtl)
end
local newMonthly = redis.call('INCRBY', KEYS[2], count)
if newMonthly == count then
  redis.call('EXPIRE', KEYS[2], monthlyTtl)
end
return 'ok'
`;

const RELEASE_SCRIPT = `
local count = tonumber(ARGV[1])
for i = 1, 2 do
  local current = tonumber(redis.call('GET', KEYS[i]) or '0')
  if current <= count then
    redis.call('DEL', KEYS[i])
  else
    redis.call('DECRBY', KEYS[i], count)
  end
end
return 1
`;

export type HumanVoiceMinuteCap = 'daily' | 'monthly';

export class HumanVoiceMinuteQuotaExceededException extends HttpException {
  constructor(cap: HumanVoiceMinuteCap, limit: number, retryAfterSeconds: number, resetsAt: string) {
    const window = cap === 'daily' ? 'daily' : 'monthly';
    super(
      {
        code: cap === 'daily' ? 'voice_minutes_daily_cap' : 'voice_minutes_monthly_cap',
        message: `Voice minute ${window} limit reached (${limit}). Resets at ${resetsAt}.`,
        retryAfterSeconds,
        resetsAt,
        cap,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}

interface HumanVoiceMinuteReservation {
  organizationId: string;
  remaining: number;
  /** Self-hosted, or Redis unavailable. Nothing was incremented. */
  unlimited: boolean;
  dailyKey?: string;
  monthlyKey?: string;
}

/**
 * Minutes held for one voice send. `accept` records minutes that stay reserved
 * until the interaction settles. `release` gives the rest back.
 */
export interface HumanVoiceMinuteCredits {
  readonly unlimited: boolean;
  /** UTC time the Redis day and month keys were chosen, before the organization lookup. */
  readonly reservedAt: Date;
  /** Minutes that stay on the interaction. The rest is returned by `release`. */
  accept(minutes?: number): void;
  /** Gives back whatever was not accepted. Idempotent. */
  release(): Promise<void>;
}

/**
 * Org-wide cap on outbound voice minutes. A call reserves its maximum duration
 * up front; settlement gives the reservation back. NV-9174 will give back only
 * the unused remainder once a real duration exists.
 */
@Injectable()
export class HumanVoiceMinuteQuotaService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly organizationRepository: CommunityOrganizationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async reserveMinutes(organizationId: string, minutes: number): Promise<HumanVoiceMinuteCredits> {
    const reservedAt = new Date();
    const reservation = await this.reserve(organizationId, minutes, reservedAt);

    return {
      unlimited: reservation.unlimited,
      reservedAt,
      accept: (accepted = minutes) => {
        if (reservation.unlimited || accepted <= 0) {
          return;
        }

        reservation.remaining = Math.max(0, reservation.remaining - accepted);
      },
      release: () => this.releaseRemaining(reservation),
    };
  }

  /** Gives minutes back to the window they were reserved in. Does not throw. */
  async releaseReserved(organizationId: string, minutes: number, reservedAt: Date): Promise<void> {
    if (minutes <= 0 || process.env.IS_SELF_HOSTED === 'true' || !this.cacheService.cacheEnabled()) {
      return;
    }

    const at = Number.isNaN(reservedAt.getTime()) ? new Date() : reservedAt;
    const keys = humanVoiceMinuteQuotaKeys(organizationId, at);

    try {
      await this.cacheService.eval(RELEASE_SCRIPT, [keys.daily, keys.monthly], [minutes]);
    } catch (err) {
      this.logger.warn({ err, organizationId, minutes }, 'Failed to release voice minute quota');
    }
  }

  private async reserve(
    organizationId: string,
    minutes: number,
    reservedAt: Date
  ): Promise<HumanVoiceMinuteReservation> {
    if (minutes <= 0 || process.env.IS_SELF_HOSTED === 'true') {
      return { organizationId, remaining: 0, unlimited: true };
    }

    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn({ organizationId, minutes }, 'Voice minute quota skipped because cache is unavailable');

      return { organizationId, remaining: 0, unlimited: true };
    }

    const limits = await this.limitsFor(organizationId);
    const keys = humanVoiceMinuteQuotaKeys(organizationId, reservedAt);

    let outcome: string | null | undefined;
    try {
      outcome = await this.cacheService.eval<string | null>(
        RESERVE_SCRIPT,
        [keys.daily, keys.monthly],
        [
          minutes,
          limits.daily,
          limits.monthly,
          secondsUntilNextUtcDay(reservedAt) + DAY_TTL_BUFFER_SECONDS,
          secondsUntilNextUtcMonth(reservedAt) + MONTH_TTL_BUFFER_SECONDS,
        ]
      );
    } catch (err) {
      this.logger.warn({ err, organizationId, minutes }, 'Voice minute quota skipped because Redis failed');

      return { organizationId, remaining: 0, unlimited: true };
    }

    if (outcome === undefined || outcome === null) {
      this.logger.warn({ organizationId, minutes }, 'Voice minute quota skipped because cache is unavailable');

      return { organizationId, remaining: 0, unlimited: true };
    }

    if (outcome === 'ok') {
      return {
        organizationId,
        remaining: minutes,
        unlimited: false,
        dailyKey: keys.daily,
        monthlyKey: keys.monthly,
      };
    }

    const cap: HumanVoiceMinuteCap = outcome === 'monthly' ? 'monthly' : 'daily';
    const limit = cap === 'monthly' ? limits.monthly : limits.daily;
    const retryAfterSeconds =
      cap === 'monthly' ? secondsUntilNextUtcMonth(reservedAt) : secondsUntilNextUtcDay(reservedAt);
    const resetsAt = (cap === 'monthly' ? nextUtcMonth(reservedAt) : nextUtcDay(reservedAt)).toISOString();

    throw new HumanVoiceMinuteQuotaExceededException(cap, limit, retryAfterSeconds, resetsAt);
  }

  private async releaseRemaining(reservation: HumanVoiceMinuteReservation): Promise<void> {
    if (reservation.unlimited || reservation.remaining <= 0) {
      return;
    }

    const count = reservation.remaining;
    reservation.remaining = 0;

    if (!this.cacheService.cacheEnabled() || !reservation.dailyKey || !reservation.monthlyKey) {
      return;
    }

    try {
      await this.cacheService.eval(RELEASE_SCRIPT, [reservation.dailyKey, reservation.monthlyKey], [count]);
    } catch (err) {
      this.logger.warn(
        { err, organizationId: reservation.organizationId, count },
        'Failed to release voice minute quota'
      );
    }
  }

  private async limitsFor(organizationId: string): Promise<{ daily: number; monthly: number }> {
    const organization = await this.organizationRepository.findById(organizationId, 'apiServiceLevel');
    const tier = organization?.apiServiceLevel ?? ApiServiceLevelEnum.FREE;

    return {
      daily: getFeatureForTierAsNumber(FeatureNameEnum.HUMAN_VOICE_MINUTE_DAILY_LIMIT, tier),
      monthly: getFeatureForTierAsNumber(FeatureNameEnum.HUMAN_VOICE_MINUTE_MONTHLY_LIMIT, tier),
    };
  }
}

export function humanVoiceMinuteQuotaKeys(organizationId: string, now: Date): { daily: string; monthly: string } {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  // Both keys share `{organizationId}` so one Lua call stays in a single Redis Cluster slot.
  return {
    daily: `human-voice-minutes:{${organizationId}}:day:${year}-${month}-${day}`,
    monthly: `human-voice-minutes:{${organizationId}}:month:${year}-${month}`,
  };
}

function nextUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

function nextUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

function secondsUntil(target: Date, now: Date): number {
  return Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 1000));
}

function secondsUntilNextUtcDay(now: Date): number {
  return secondsUntil(nextUtcDay(now), now);
}

function secondsUntilNextUtcMonth(now: Date): number {
  return secondsUntil(nextUtcMonth(now), now);
}
