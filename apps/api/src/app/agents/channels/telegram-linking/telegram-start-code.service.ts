import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

import { mintAutolinkSafeOpaqueToken } from '../../../shared/helpers';

/**
 * Telegram `?start=` allows at most 64 base64url chars; we use 32-char opaque
 * codes. Minted from an alphanumeric-only alphabet so the `t.me/<bot>?start=…`
 * deep link autolinks fully when shared as a bare URL in chat clients.
 */
export const TELEGRAM_START_CODE_TTL_SECONDS = 10 * 60;

const CACHE_KEY_PREFIX = 'telegram-start-code:';

export interface TelegramStartCodePayload {
  _environmentId: string;
  _organizationId: string;
  agentIdentifier: string;
  _integrationId: string;
  subscriberId: string;
}

export interface TelegramStartCodeScope {
  environmentId: string;
  organizationId: string;
  integrationId: string;
  agentIdentifier: string;
}

export type ConsumeStartCodeResult =
  | { status: 'consumed'; payload: TelegramStartCodePayload }
  | { status: 'mismatch'; payload: TelegramStartCodePayload }
  | { status: 'missing' };

/**
 * Atomically GET-and-conditionally-DEL the cached start code. Scope match
 * deletes (one-time use); scope mismatch leaves the row so the legitimate bot
 * can still consume it. Returning the encoded JSON keeps decoding in Node
 * rather than relying on cjson semantics inside Redis.
 */
const CONSUME_IF_MATCHES_SCRIPT = `
local v = redis.call('get', KEYS[1])
if not v then return '' end
local ok, payload = pcall(cjson.decode, v)
if not ok then
  redis.call('del', KEYS[1])
  return ''
end
if payload._environmentId == ARGV[1]
   and payload._organizationId == ARGV[2]
   and payload._integrationId == ARGV[3]
   and payload.agentIdentifier == ARGV[4] then
  redis.call('del', KEYS[1])
  return 'M' .. v
end
return 'X' .. v
`;

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
    const code = mintAutolinkSafeOpaqueToken();
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
   * Atomically validate scope and consume (delete) the code in a single Redis op,
   * preserving single-use semantics under concurrent `/start <code>` deliveries.
   * Mismatched scopes leave the row intact so the legitimate bot can still consume it.
   */
  async consumeIfMatches(code: string, scope: TelegramStartCodeScope): Promise<ConsumeStartCodeResult> {
    if (!code || !this.cacheService.cacheEnabled()) {
      return { status: 'missing' };
    }

    let raw: string | null = null;
    try {
      raw = await this.cacheService.eval<string | null>(
        CONSUME_IF_MATCHES_SCRIPT,
        [this.cacheKey(code)],
        [scope.environmentId, scope.organizationId, scope.integrationId, scope.agentIdentifier]
      );
    } catch (err) {
      this.logger.warn(`Failed to consume telegram start code: ${(err as Error).message}`);

      return { status: 'missing' };
    }

    if (!raw) {
      return { status: 'missing' };
    }

    const status = raw.charAt(0);
    const body = raw.slice(1);

    const payload = this.parsePayload(body);
    if (!payload) {
      return { status: 'missing' };
    }

    if (status === 'M') {
      return { status: 'consumed', payload };
    }

    if (status === 'X') {
      return { status: 'mismatch', payload };
    }

    return { status: 'missing' };
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

  private parsePayload(raw: string): TelegramStartCodePayload | null {
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

  private cacheKey(code: string): string {
    return `${CACHE_KEY_PREFIX}${code}`;
  }
}
