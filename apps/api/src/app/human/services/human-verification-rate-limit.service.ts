import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import type { HumanChannelViaEnum } from '@novu/shared';

/** Minimum gap between verification emails for one human × channel. */
export const HUMAN_VERIFICATION_COOLDOWN_SECONDS = 60;

/** Cap on verification emails per human × channel in a rolling 24h window. */
export const HUMAN_VERIFICATION_DAILY_CAP = 5;

const HUMAN_VERIFICATION_DAILY_WINDOW_SECONDS = 24 * 60 * 60;

/**
 * Per-(env, agent, subscriber, via) send throttling for verification emails.
 * Unauthenticated invite-page requests are token-gated only, so this is the
 * primary anti-spam control on the public path.
 */
@Injectable()
export class HumanVerificationRateLimitService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Throws HttpException 429 when the cooldown or daily cap is hit. On success,
   * arms the cooldown and increments the daily counter.
   *
   * The cooldown is taken with SET NX so overlapping public invite requests
   * cannot all pass a separate read. Cache disabled (`undefined`) fails open,
   * matching the rest of CacheService.
   */
  async assertAndRecord(params: {
    environmentId: string;
    agentId: string;
    subscriberId: string;
    via: HumanChannelViaEnum;
  }): Promise<{ retryAfterSeconds: number }> {
    const cooldownKey = this.cooldownKey(params);
    const reserved = await this.cacheService.setIfNotExist(cooldownKey, '1', {
      ttl: HUMAN_VERIFICATION_COOLDOWN_SECONDS,
    });
    if (reserved === undefined) {
      return { retryAfterSeconds: HUMAN_VERIFICATION_COOLDOWN_SECONDS };
    }
    if (reserved === null) {
      throw this.cooldownException();
    }

    const dailyKey = this.dailyKey(params);
    const dailyRaw = await this.cacheService.get(dailyKey);
    const dailyCount = dailyRaw ? Number.parseInt(dailyRaw, 10) : 0;
    if (Number.isFinite(dailyCount) && dailyCount >= HUMAN_VERIFICATION_DAILY_CAP) {
      await this.cacheService.del(cooldownKey);
      throw this.capException();
    }

    if (!dailyRaw) {
      await this.cacheService.set(dailyKey, '1', { ttl: HUMAN_VERIFICATION_DAILY_WINDOW_SECONDS });
    } else {
      await this.cacheService.incr(dailyKey);
    }

    return { retryAfterSeconds: HUMAN_VERIFICATION_COOLDOWN_SECONDS };
  }

  /**
   * Gives back the reservation when the verification email was not sent.
   * The daily counter is adjusted before the cooldown key is removed, so a
   * concurrent request cannot reserve and then have its increment undone.
   */
  async release(params: {
    environmentId: string;
    agentId: string;
    subscriberId: string;
    via: HumanChannelViaEnum;
  }): Promise<void> {
    const dailyKey = this.dailyKey(params);
    const dailyRaw = await this.cacheService.get(dailyKey);
    const dailyCount = dailyRaw ? Number.parseInt(dailyRaw, 10) : 0;

    if (dailyCount <= 1) {
      await this.cacheService.del(dailyKey);
    } else {
      await this.cacheService.incrIfExistsAtomic(dailyKey, -1);
    }

    await this.cacheService.del(this.cooldownKey(params));
  }

  private cooldownException(): HttpException {
    return new HttpException(
      {
        code: 'verification_cooldown',
        message: 'A verification email was just sent. Wait a moment before resending.',
        retryAfterSeconds: HUMAN_VERIFICATION_COOLDOWN_SECONDS,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  private capException(): HttpException {
    return new HttpException(
      {
        code: 'verification_cap',
        message: 'Too many verification emails today. Try again tomorrow.',
        retryAfterSeconds: HUMAN_VERIFICATION_DAILY_WINDOW_SECONDS,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  private cooldownKey(params: {
    environmentId: string;
    agentId: string;
    subscriberId: string;
    via: HumanChannelViaEnum;
  }): string {
    return `human_verify_cooldown:{${params.environmentId}:${params.agentId}:${params.subscriberId}:${params.via}}`;
  }

  private dailyKey(params: {
    environmentId: string;
    agentId: string;
    subscriberId: string;
    via: HumanChannelViaEnum;
  }): string {
    return `human_verify_daily:{${params.environmentId}:${params.agentId}:${params.subscriberId}:${params.via}}`;
  }
}
