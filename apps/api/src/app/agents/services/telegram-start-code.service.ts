import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

/** Telegram `?start=` allows at most 64 base64url chars; we use 32-char opaque codes. */
export const TELEGRAM_START_CODE_TTL_SECONDS = 10 * 60;

const CACHE_KEY_PREFIX = 'telegram-start-code:';

export interface TelegramStartCodePayload {
  _environmentId: string;
  _organizationId: string;
  agentIdentifier: string;
  _integrationId: string;
  subscriberId: string;
}

@Injectable()
export class TelegramStartCodeService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async issue(params: {
    environmentId: string;
    organizationId: string;
    agentIdentifier: string;
    integrationId: string;
    subscriberId: string;
  }): Promise<{ code: string; expiresAt: string }> {
    const code = randomBytes(24).toString('base64url');
    const payload: TelegramStartCodePayload = {
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
      agentIdentifier: params.agentIdentifier,
      _integrationId: params.integrationId,
      subscriberId: params.subscriberId,
    };

    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn('Cache unavailable — cannot persist Telegram start code');

      throw new Error('Cache is required to issue Telegram subscriber start codes');
    }

    await this.cacheService.set(this.cacheKey(code), JSON.stringify(payload), {
      ttl: TELEGRAM_START_CODE_TTL_SECONDS,
    });

    const expiresAt = new Date(Date.now() + TELEGRAM_START_CODE_TTL_SECONDS * 1000).toISOString();

    return { code, expiresAt };
  }

  /**
   * Read a start code without removing it. Used to validate integration match
   * before consuming; on mismatch the row must stay for retry on the correct bot.
   */
  async peek(code: string): Promise<TelegramStartCodePayload | null> {
    if (!code || !this.cacheService.cacheEnabled()) {

      return null;
    }

    const raw = await this.cacheService.get(this.cacheKey(code));
    if (!raw) {

      return null;
    }

    try {
      const parsed = JSON.parse(raw) as TelegramStartCodePayload;

      if (
        !parsed?._environmentId ||
        !parsed?._organizationId ||
        !parsed?.agentIdentifier ||
        !parsed?._integrationId ||
        !parsed?.subscriberId
      ) {

        return null;
      }

      return parsed;
    } catch {

      return null;
    }
  }

  async delete(code: string): Promise<void> {
    if (!code || !this.cacheService.cacheEnabled()) {

      return;
    }

    try {
      await this.cacheService.del(this.cacheKey(code));
    } catch (err) {
      this.logger.warn(`Failed to delete telegram start code: ${(err as Error).message}`);
    }
  }

  private cacheKey(code: string): string {

    return `${CACHE_KEY_PREFIX}${code}`;
  }
}
