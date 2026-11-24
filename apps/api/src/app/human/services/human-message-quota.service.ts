import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsNumber } from '@novu/shared';

const DAY_TTL_BUFFER_SECONDS = 60 * 60;
const MONTH_TTL_BUFFER_SECONDS = 24 * 60 * 60;
/** A notice that didn't reach the operator is tried again by a refusal this long after. */
const NOTICE_RETRY_SECONDS = 5 * 60;

/**
 * Check both windows before either increment so a monthly rejection cannot
 * leave a daily credit held. INCRBY + EXPIRE stay inside this script so two
 * reservations at the boundary cannot both pass. The month is checked first:
 * when both windows are used up, the refusal names the later reset.
 */
const RESERVE_SCRIPT = `
local count = tonumber(ARGV[1])
local dailyLimit = tonumber(ARGV[2])
local monthlyLimit = tonumber(ARGV[3])
local dailyTtl = tonumber(ARGV[4])
local monthlyTtl = tonumber(ARGV[5])
local daily = tonumber(redis.call('GET', KEYS[1]) or '0')
local monthly = tonumber(redis.call('GET', KEYS[2]) or '0')
if monthly + count > monthlyLimit then
  return 'monthly'
end
if daily + count > dailyLimit then
  return 'daily'
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

/**
 * The operator hears that the account ran out of messages once per window, when its last credit is spent: the
 * month's when it is used up, which outlasts the day's, else the day's. Each notice's own key sits next to its
 * window's counter, in the same Redis Cluster slot.
 */
const CLAIM_NOTICE_SCRIPT = `
local daily = tonumber(redis.call('GET', KEYS[1]) or '0')
local monthly = tonumber(redis.call('GET', KEYS[2]) or '0')
local cap = 'none'
local notice = KEYS[3]
local ttl = tonumber(ARGV[3])
if monthly >= tonumber(ARGV[2]) then
  cap = 'monthly'
  notice = KEYS[4]
  ttl = tonumber(ARGV[4])
elseif daily >= tonumber(ARGV[1]) then
  cap = 'daily'
end
if cap ~= 'none' and redis.call('SET', notice, '1', 'NX', 'EX', ttl) then
  return cap
end
return 'none'
`;

export type HumanMessageCap = 'daily' | 'monthly';

/** A window the account used up: which one, its limit, and when it starts over. */
export type UsedUpWindow = { cap: HumanMessageCap; limit: number; resetsAt: string };

export class HumanMessageQuotaExceededException extends HttpException {
  constructor(
    readonly cap: HumanMessageCap,
    readonly limit: number,
    retryAfterSeconds: number,
    readonly resetsAt: string
  ) {
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

/** How much of one window the account has used, and when the window starts over. */
export type HumanMessageWindowUsage = { used: number; limit: number; resetsAt: string };

export type HumanMessageUsage = { daily: HumanMessageWindowUsage; monthly: HumanMessageWindowUsage };

interface HumanMessageReservation {
  organizationId: string;
  remaining: number;
  /** Self-hosted, or Redis unavailable. Nothing was incremented. */
  unlimited: boolean;
  dailyKey?: string;
  monthlyKey?: string;
}

/**
 * Credits held for one Human send. `accept` records recipients whose delivery
 * succeeded. `release` gives the rest back.
 */
export interface HumanMessageCredits {
  /** Call once per recipient whose message was accepted. */
  accept(count?: number): void;
  /** Gives back whatever was not accepted. Idempotent. */
  release(): Promise<void>;
}

/**
 * Org-wide abuse cap on signed-up Human messages. Same windows as the Agent
 * Email Inbox: a UTC day and a UTC month, read from the tier table.
 */
@Injectable()
export class HumanMessageQuotaService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly organizationRepository: CommunityOrganizationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Holds `count` credits on both windows. Throws 429 when either window cannot
   * cover the whole count. Self-hosted and a disabled cache fail open.
   */
  async reserveCredits(organizationId: string, count: number): Promise<HumanMessageCredits> {
    const reservation = await this.reserve(organizationId, count);

    return {
      accept: (accepted = 1) => {
        if (reservation.unlimited || accepted <= 0) {
          return;
        }

        reservation.remaining = Math.max(0, reservation.remaining - accepted);
      },
      release: () => this.releaseRemaining(reservation),
    };
  }

  /**
   * The window a refused send tells the operator about, when it is the one to: a window whose every credit is spent,
   * and nobody was told yet. Whichever window refused the send: a send to two people refused for the month while
   * today's credits are what ran out tells them about today. A send refused while a few credits remain finds neither
   * used up. Never throws: without the cache, or on its error, nobody is told.
   */
  async claimLimitNotice(organizationId: string): Promise<UsedUpWindow | null> {
    if (!this.cacheService.cacheEnabled()) {
      return null;
    }

    const now = new Date();
    const keys = humanMessageQuotaKeys(organizationId, now);

    try {
      const limits = await this.limitsFor(organizationId);
      const claimed = await this.cacheService.eval<string>(
        CLAIM_NOTICE_SCRIPT,
        [keys.daily, keys.monthly, noticeKey(keys.daily), noticeKey(keys.monthly)],
        [
          limits.daily,
          limits.monthly,
          secondsUntilNextUtcDay(now) + DAY_TTL_BUFFER_SECONDS,
          secondsUntilNextUtcMonth(now) + MONTH_TTL_BUFFER_SECONDS,
        ]
      );

      if (claimed === 'monthly') {
        return { cap: 'monthly', limit: limits.monthly, resetsAt: nextUtcMonth(now).toISOString() };
      }

      return claimed === 'daily'
        ? { cap: 'daily', limit: limits.daily, resetsAt: nextUtcDay(now).toISOString() }
        : null;
    } catch (err) {
      this.logger.warn({ err, organizationId }, 'Failed to claim the message limit notice');

      return null;
    }
  }

  /**
   * The notice didn't reach the operator: a refusal a few minutes later tries again, instead of none until the
   * window starts over.
   */
  async retryLimitNoticeLater(organizationId: string, window: UsedUpWindow): Promise<void> {
    if (!this.cacheService.cacheEnabled()) {
      return;
    }

    const keys = humanMessageQuotaKeys(organizationId, new Date());

    try {
      await this.cacheService.set(noticeKey(window.cap === 'daily' ? keys.daily : keys.monthly), 1, {
        ttl: NOTICE_RETRY_SECONDS,
        jitter: false,
      });
    } catch (err) {
      this.logger.warn({ err, organizationId }, 'Failed to let the message limit notice be tried again');
    }
  }

  /**
   * How much of today's and this month's messages the account has used, as the dashboard shows it. `null` where
   * nothing is counted: self-hosted, or without the cache.
   */
  async usage(organizationId: string): Promise<HumanMessageUsage | null> {
    if (process.env.IS_SELF_HOSTED === 'true' || !this.cacheService.cacheEnabled()) {
      return null;
    }

    const now = new Date();
    const keys = humanMessageQuotaKeys(organizationId, now);

    try {
      const [limits, [daily, monthly]] = await Promise.all([
        this.limitsFor(organizationId),
        this.cacheService.mget([keys.daily, keys.monthly]),
      ]);

      return {
        daily: { used: Number(daily ?? 0), limit: limits.daily, resetsAt: nextUtcDay(now).toISOString() },
        monthly: { used: Number(monthly ?? 0), limit: limits.monthly, resetsAt: nextUtcMonth(now).toISOString() },
      };
    } catch (err) {
      this.logger.warn({ err, organizationId }, 'Failed to read the message usage');

      return null;
    }
  }

  private async reserve(organizationId: string, count: number): Promise<HumanMessageReservation> {
    if (count <= 0 || process.env.IS_SELF_HOSTED === 'true') {
      return { organizationId, remaining: 0, unlimited: true };
    }

    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn({ organizationId, count }, 'Human message quota skipped because cache is unavailable');

      return { organizationId, remaining: 0, unlimited: true };
    }

    const now = new Date();
    const limits = await this.limitsFor(organizationId);
    const keys = humanMessageQuotaKeys(organizationId, now);

    let outcome: string | null | undefined;
    try {
      outcome = await this.cacheService.eval<string | null>(
        RESERVE_SCRIPT,
        [keys.daily, keys.monthly],
        [
          count,
          limits.daily,
          limits.monthly,
          secondsUntilNextUtcDay(now) + DAY_TTL_BUFFER_SECONDS,
          secondsUntilNextUtcMonth(now) + MONTH_TTL_BUFFER_SECONDS,
        ]
      );
    } catch (err) {
      this.logger.warn({ err, organizationId, count }, 'Human message quota skipped because Redis failed');

      return { organizationId, remaining: 0, unlimited: true };
    }

    if (outcome === undefined || outcome === null) {
      this.logger.warn({ organizationId, count }, 'Human message quota skipped because cache is unavailable');

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

    const cap: HumanMessageCap = outcome === 'monthly' ? 'monthly' : 'daily';
    const limit = cap === 'monthly' ? limits.monthly : limits.daily;
    const retryAfterSeconds = cap === 'monthly' ? secondsUntilNextUtcMonth(now) : secondsUntilNextUtcDay(now);
    const resetsAt = (cap === 'monthly' ? nextUtcMonth(now) : nextUtcDay(now)).toISOString();

    throw new HumanMessageQuotaExceededException(cap, limit, retryAfterSeconds, resetsAt);
  }

  private async releaseRemaining(reservation: HumanMessageReservation): Promise<void> {
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
        'Failed to release Human message quota'
      );
    }
  }

  private async limitsFor(organizationId: string): Promise<{ daily: number; monthly: number }> {
    const organization = await this.organizationRepository.findById(organizationId, 'apiServiceLevel');
    const tier = organization?.apiServiceLevel ?? ApiServiceLevelEnum.FREE;

    return {
      daily: getFeatureForTierAsNumber(FeatureNameEnum.HUMAN_MESSAGE_DAILY_LIMIT, tier),
      monthly: getFeatureForTierAsNumber(FeatureNameEnum.HUMAN_MESSAGE_MONTHLY_LIMIT, tier),
    };
  }
}

export function humanMessageQuotaKeys(organizationId: string, now: Date): { daily: string; monthly: string } {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  // Both keys share `{organizationId}` so one Lua call stays in a single Redis Cluster slot.
  return {
    daily: `human-message:{${organizationId}}:day:${year}-${month}-${day}`,
    monthly: `human-message:{${organizationId}}:month:${year}-${month}`,
  };
}

/** Next to a window's counter, in the same slot, the key saying that the operator was told. */
function noticeKey(counter: string): string {
  return `${counter}:notice`;
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
