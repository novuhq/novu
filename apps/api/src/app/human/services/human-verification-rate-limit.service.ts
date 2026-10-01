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
   */
  async assertAndRecord(params: {
    environmentId: string;
    agentId: string;
    subscriberId: string;
    via: HumanChannelViaEnum;
  }): Promise<{ retryAfterSeconds: number }> {
    const cooldownKey = this.cooldownKey(params);
    const dailyKey = this.dailyKey(params);

    const existingCooldown = await this.cacheService.get(cooldownKey);
    if (existingCooldown) {
      throw new HttpException(
        {
          code: 'verification_cooldown',
          message: 'A verification email was just sent. Wait a moment before resending.',
          retryAfterSeconds: HUMAN_VERIFICATION_COOLDOWN_SECONDS,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const dailyRaw = await this.cacheService.get(dailyKey);
    const dailyCount = dailyRaw ? Number.parseInt(dailyRaw, 10) : 0;
    if (Number.isFinite(dailyCount) && dailyCount >= HUMAN_VERIFICATION_DAILY_CAP) {
      throw new HttpException(
        {
          code: 'verification_cap',
          message: 'Too many verification emails today. Try again tomorrow.',
          retryAfterSeconds: HUMAN_VERIFICATION_DAILY_WINDOW_SECONDS,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    await this.cacheService.set(cooldownKey, '1', { ttl: HUMAN_VERIFICATION_COOLDOWN_SECONDS });

    if (!dailyRaw) {
      await this.cacheService.set(dailyKey, '1', { ttl: HUMAN_VERIFICATION_DAILY_WINDOW_SECONDS });
    } else {
      await this.cacheService.incr(dailyKey);
    }

    return { retryAfterSeconds: HUMAN_VERIFICATION_COOLDOWN_SECONDS };
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
