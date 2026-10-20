import { AsyncLocalStorage } from 'node:async_hooks';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsNumber } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { CacheService } from '../cache/cache.service';

const DAY_TTL_BUFFER_SECONDS = 60 * 60;
const MONTH_TTL_BUFFER_SECONDS = 24 * 60 * 60;

/**
 * Check both windows before either increment so a monthly rejection cannot
 * leave a daily credit held. INCRBY + EXPIRE stay inside this script so two
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

export type AgentEmailInboxCap = 'daily' | 'monthly';

export class AgentEmailInboxQuotaExceededException extends HttpException {
  constructor(cap: AgentEmailInboxCap, limit: number, retryAfterSeconds: number, resetsAt: string) {
    const window = cap === 'daily' ? 'daily' : 'monthly';
    super(
      {
        code: cap === 'daily' ? 'agent_email_inbox_daily_cap' : 'agent_email_inbox_monthly_cap',
        message: `Agent Email Inbox ${window} limit reached (${limit}). Resets at ${resetsAt}.`,
        retryAfterSeconds,
        cap,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}

export function isAgentEmailInboxQuotaExceeded(err: unknown): err is AgentEmailInboxQuotaExceededException {
  return err instanceof AgentEmailInboxQuotaExceededException;
}

/**
 * Credits held for one Human action. `remaining` is decremented as the sender
 * accepts each email. Unused credits are released back to Redis.
 *
 * Internal: call sites get an {@link AgentEmailInboxCredits} scope instead, so
 * "I consumed a credit" can only be expressed by actually sending.
 */
interface AgentEmailInboxReservation {
  organizationId: string;
  remaining: number;
  /** Self-hosted, or Redis unavailable. Nothing was incremented. */
  unlimited: boolean;
  /** Set when credits were incremented, so a release hits the same windows. */
  dailyKey?: string;
  monthlyKey?: string;
}

/**
 * A held block of credits. The only way to spend one is to send inside `run`:
 * the sender consumes from the active scope via {@link AgentEmailInboxQuotaService.beginSend}.
 */
export interface AgentEmailInboxCredits {
  /** Makes these credits the active reservation for the duration of `fn`. */
  run<T>(fn: () => Promise<T>): Promise<T>;
  /** Gives back whatever the sender did not consume. Idempotent. */
  release(): Promise<void>;
}

export interface AgentEmailInboxSendAttempt {
  /** Call after the outbound provider accepts the message. */
  accept: () => void;
  /** Call when the provider did not accept the message. */
  release: () => Promise<void>;
}

/**
 * Org-wide Agent Email Inbox caps. Lives here so the API and the worker share
 * one choke point: relay replies send from whichever process owns the adapter.
 */
@Injectable()
export class AgentEmailInboxQuotaService {
  private readonly reservationContext = new AsyncLocalStorage<AgentEmailInboxReservation>();

  constructor(
    private readonly cacheService: CacheService,
    private readonly organizationRepository: CommunityOrganizationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Holds `count` credits for the duration of `fn` and gives back whatever the
   * sender did not consume. Throws 429 when either window cannot cover `count`.
   */
  async withCredits<T>(organizationId: string, count: number, fn: () => Promise<T>): Promise<T> {
    const credits = await this.reserveCredits(organizationId, count);

    try {
      return await credits.run(fn);
    } finally {
      await credits.release();
    }
  }

  /**
   * Holds `count` credits without scoping them to a single call. Prefer
   * {@link withCredits}; this exists for callers that must react to the 429
   * before deciding what to run, and they still own the `release()`.
   */
  async reserveCredits(organizationId: string, count: number): Promise<AgentEmailInboxCredits> {
    const reservation = await this.reserve(organizationId, count);

    return {
      run: <T>(fn: () => Promise<T>) => this.reservationContext.run(reservation, fn),
      release: () => this.releaseRemaining(reservation),
    };
  }

  /**
   * Holds `count` credits on both the UTC day and UTC month counters.
   * Throws 429 when either window cannot cover the whole count.
   * Self-hosted and a disabled cache fail open.
   */
  private async reserve(organizationId: string, count: number): Promise<AgentEmailInboxReservation> {
    if (count <= 0 || process.env.IS_SELF_HOSTED === 'true') {
      return { organizationId, remaining: 0, unlimited: true };
    }

    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn({ organizationId, count }, 'Agent Email Inbox quota skipped because cache is unavailable');

      return { organizationId, remaining: 0, unlimited: true };
    }

    const now = new Date();
    const limits = await this.limitsFor(organizationId);
    const keys = quotaKeys(organizationId, now);

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
      this.logger.warn({ err, organizationId, count }, 'Agent Email Inbox quota skipped because Redis failed');

      return { organizationId, remaining: 0, unlimited: true };
    }

    if (outcome === undefined || outcome === null) {
      this.logger.warn({ organizationId, count }, 'Agent Email Inbox quota skipped because cache is unavailable');

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

    const cap: AgentEmailInboxCap = outcome === 'monthly' ? 'monthly' : 'daily';
    const limit = cap === 'monthly' ? limits.monthly : limits.daily;
    const retryAfterSeconds = cap === 'monthly' ? secondsUntilNextUtcMonth(now) : secondsUntilNextUtcDay(now);
    const resetsAt = (cap === 'monthly' ? nextUtcMonth(now) : nextUtcDay(now)).toISOString();

    throw new AgentEmailInboxQuotaExceededException(cap, limit, retryAfterSeconds, resetsAt);
  }

  /** Gives unused credits back. Safe to call when the reservation was unlimited. */
  private async releaseRemaining(reservation: AgentEmailInboxReservation): Promise<void> {
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
        'Failed to release Agent Email Inbox quota'
      );
    }
  }

  /**
   * Sender choke point. Every outbound Agent Email Inbox message goes through
   * here. A send inside an active reservation consumes one held credit; a send
   * with no reservation (agent replies, which hold none) is counted here, so no
   * send can skip the cap.
   */
  async beginSend(organizationId: string): Promise<AgentEmailInboxSendAttempt> {
    const active = this.reservationContext.getStore();
    if (active?.organizationId === organizationId && (active.unlimited || active.remaining > 0)) {
      return {
        accept: () => {
          if (!active.unlimited && active.remaining > 0) {
            active.remaining -= 1;
          }
        },
        release: async () => undefined,
      };
    }

    this.logger.debug({ organizationId }, 'Agent Email Inbox send had no reservation; counting it at the sender');
    const reservation = await this.reserve(organizationId, 1);
    let accepted = false;

    return {
      accept: () => {
        accepted = true;
        reservation.remaining = 0;
      },
      release: async () => {
        if (!accepted) {
          await this.releaseRemaining(reservation);
        }
      },
    };
  }

  private async limitsFor(organizationId: string): Promise<{ daily: number; monthly: number }> {
    const organization = await this.organizationRepository.findById(organizationId, 'apiServiceLevel');
    const tier = organization?.apiServiceLevel ?? ApiServiceLevelEnum.FREE;

    return {
      daily: getFeatureForTierAsNumber(FeatureNameEnum.AGENT_EMAIL_INBOX_DAILY_LIMIT, tier),
      monthly: getFeatureForTierAsNumber(FeatureNameEnum.AGENT_EMAIL_INBOX_MONTHLY_LIMIT, tier),
    };
  }
}

export function quotaKeys(organizationId: string, now: Date): { daily: string; monthly: string } {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  // Both keys share `{organizationId}` so one Lua call stays in a single Redis Cluster slot.
  return {
    daily: `agent-email-inbox:{${organizationId}}:day:${year}-${month}-${day}`,
    monthly: `agent-email-inbox:{${organizationId}}:month:${year}-${month}`,
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
