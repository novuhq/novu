import { HttpException } from '@nestjs/common';
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

export type QuotaWindow = 'daily' | 'monthly';

/** What makes one tiered quota different from another. Everything else is shared. */
export interface TieredWindowQuotaSpec {
  /** Redis key prefix, e.g. `human-message`. */
  keyPrefix: string;
  dailyFeature: FeatureNameEnum;
  monthlyFeature: FeatureNameEnum;
  /** Names this quota in warn logs, e.g. `Human message quota`. */
  logLabel: string;
  /** The 429 thrown when a window cannot cover the whole count. */
  exceeded(window: QuotaWindow, limit: number, retryAfterSeconds: number, resetsAt: string): HttpException;
}

interface WindowReservation {
  organizationId: string;
  remaining: number;
  /** Self-hosted, or Redis unavailable. Nothing was incremented. */
  unlimited: boolean;
  dailyKey?: string;
  monthlyKey?: string;
}

/**
 * An amount held on both windows for one request. `accept` records the part that
 * stays held; `release` gives the rest back.
 */
export interface WindowQuotaCredits {
  readonly unlimited: boolean;
  /** UTC time the day and month keys were chosen. Needed to give back into the same windows later. */
  readonly reservedAt: Date;
  accept(count?: number): void;
  /** Gives back whatever was not accepted. Idempotent. */
  release(): Promise<void>;
}

/**
 * An org-wide cap over a UTC day and a UTC month, with both limits read from the
 * tier table. One engine behind every Agent Inbox quota: the windows, the Lua,
 * the fail-open rules and the TTL boundaries are identical, and only the key
 * prefix, the two tier features and the 429 differ per quota.
 */
export abstract class TieredWindowQuotaService {
  protected abstract readonly spec: TieredWindowQuotaSpec;

  constructor(
    protected readonly cacheService: CacheService,
    protected readonly organizationRepository: CommunityOrganizationRepository,
    protected readonly logger: PinoLogger
  ) {}

  /**
   * Holds `count` on both windows. Throws the spec's 429 when either window
   * cannot cover the whole count. Self-hosted and a disabled cache fail open.
   *
   * `defaultAccept` is what a bare `accept()` records — one recipient for a
   * per-message quota, the whole reservation for one that settles in full.
   */
  protected async reserveWindows(
    organizationId: string,
    count: number,
    defaultAccept: number
  ): Promise<WindowQuotaCredits> {
    const reservedAt = new Date();
    const reservation = await this.reserve(organizationId, count, reservedAt);

    return {
      unlimited: reservation.unlimited,
      reservedAt,
      accept: (accepted = defaultAccept) => {
        if (reservation.unlimited || accepted <= 0) {
          return;
        }

        reservation.remaining = Math.max(0, reservation.remaining - accepted);
      },
      release: () => this.releaseRemaining(reservation),
    };
  }

  /** Gives an amount back to the windows it was reserved in. Does not throw. */
  protected async releaseInto(organizationId: string, count: number, reservedAt: Date): Promise<void> {
    if (count <= 0 || process.env.IS_SELF_HOSTED === 'true' || !this.cacheService.cacheEnabled()) {
      return;
    }

    const at = Number.isNaN(reservedAt.getTime()) ? new Date() : reservedAt;
    const keys = this.keysFor(organizationId, at);

    try {
      await this.cacheService.eval(RELEASE_SCRIPT, [keys.daily, keys.monthly], [count]);
    } catch (err) {
      this.logger.warn({ err, organizationId, count }, `Failed to release ${this.spec.logLabel}`);
    }
  }

  protected keysFor(organizationId: string, now: Date): { daily: string; monthly: string } {
    return quotaWindowKeys(this.spec.keyPrefix, organizationId, now);
  }

  private async reserve(organizationId: string, count: number, reservedAt: Date): Promise<WindowReservation> {
    if (count <= 0 || process.env.IS_SELF_HOSTED === 'true') {
      return { organizationId, remaining: 0, unlimited: true };
    }

    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn({ organizationId, count }, `${this.spec.logLabel} skipped because cache is unavailable`);

      return { organizationId, remaining: 0, unlimited: true };
    }

    const limits = await this.limitsFor(organizationId);
    const keys = this.keysFor(organizationId, reservedAt);

    let outcome: string | null | undefined;
    try {
      outcome = await this.cacheService.eval<string | null>(
        RESERVE_SCRIPT,
        [keys.daily, keys.monthly],
        [
          count,
          limits.daily,
          limits.monthly,
          secondsUntilNextUtcDay(reservedAt) + DAY_TTL_BUFFER_SECONDS,
          secondsUntilNextUtcMonth(reservedAt) + MONTH_TTL_BUFFER_SECONDS,
        ]
      );
    } catch (err) {
      this.logger.warn({ err, organizationId, count }, `${this.spec.logLabel} skipped because Redis failed`);

      return { organizationId, remaining: 0, unlimited: true };
    }

    if (outcome === undefined || outcome === null) {
      this.logger.warn({ organizationId, count }, `${this.spec.logLabel} skipped because cache is unavailable`);

      return { organizationId, remaining: 0, unlimited: true };
    }

    if (outcome === 'ok') {
      return {
        organizationId,
        remaining: count,
        unlimited: false,
        dailyKey: keys.daily,
        monthlyKey: keys.monthly,
      };
    }

    const window: QuotaWindow = outcome === 'monthly' ? 'monthly' : 'daily';
    const limit = window === 'monthly' ? limits.monthly : limits.daily;
    const retryAfterSeconds =
      window === 'monthly' ? secondsUntilNextUtcMonth(reservedAt) : secondsUntilNextUtcDay(reservedAt);
    const resetsAt = (window === 'monthly' ? nextUtcMonth(reservedAt) : nextUtcDay(reservedAt)).toISOString();

    throw this.spec.exceeded(window, limit, retryAfterSeconds, resetsAt);
  }

  private async releaseRemaining(reservation: WindowReservation): Promise<void> {
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
        `Failed to release ${this.spec.logLabel}`
      );
    }
  }

  private async limitsFor(organizationId: string): Promise<{ daily: number; monthly: number }> {
    const organization = await this.organizationRepository.findById(organizationId, 'apiServiceLevel');
    const tier = organization?.apiServiceLevel ?? ApiServiceLevelEnum.FREE;

    return {
      daily: getFeatureForTierAsNumber(this.spec.dailyFeature, tier),
      monthly: getFeatureForTierAsNumber(this.spec.monthlyFeature, tier),
    };
  }
}

export function quotaWindowKeys(
  keyPrefix: string,
  organizationId: string,
  now: Date
): { daily: string; monthly: string } {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  // Both keys share `{organizationId}` so one Lua call stays in a single Redis Cluster slot.
  return {
    daily: `${keyPrefix}:{${organizationId}}:day:${year}-${month}-${day}`,
    monthly: `${keyPrefix}:{${organizationId}}:month:${year}-${month}`,
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
