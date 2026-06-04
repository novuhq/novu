import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

/**
 * Lifetime of a connect claim token (seconds). The user receives the link in
 * their connected channel after hitting the keyless demo cap and may take a
 * while to sign up, so this is intentionally long-lived (7 days).
 */
export const CONNECT_CLAIM_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const CACHE_KEY_PREFIX = 'connect_claim_link:';
const USED_KEY_PREFIX = 'connect_claim_link_used:';

/** 24 bytes → 32 URL-safe base64url characters. */
const TOKEN_BYTES = 24;
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{32}$/;

/** Wrap token in `{…}` so storage + used-marker keys share a Redis Cluster hash slot. */
function clusterSlotTag(token: string): string {
  return `{${token}}`;
}

/**
 * Atomically GETDEL the payload and set the used-marker with matching TTL.
 * Returns '' (missing), 'U' (already used), 'I' (corrupt payload), or 'M' + JSON body.
 */
const CLAIM_ATOMIC_SCRIPT = `
local raw = redis.call('GETDEL', KEYS[1])
if not raw then
  if redis.call('GET', KEYS[2]) then
    return 'U'
  end
  return ''
end
local ok, parsed = pcall(cjson.decode, raw)
if not ok or not parsed.expiresAt or not parsed.payload then
  return 'I'
end
local now = tonumber(ARGV[1])
local ttl = parsed.expiresAt - now
if ttl < 1 then ttl = 1 end
redis.call('SET', KEYS[2], '1', 'EX', ttl)
return 'M' .. raw
`;

export interface ConnectClaimTokenPayload {
  /** Keyless environment id being claimed. */
  env: string;
  /** Keyless organization id (the shared keyless org). */
  org: string;
}

interface StoredEntry {
  payload: ConnectClaimTokenPayload;
  /** Epoch seconds when this entry naturally expires. */
  expiresAt: number;
}

export interface IssuedConnectClaimToken {
  token: string;
  /** ISO timestamp when this token expires. */
  expiresAt: string;
}

export class InvalidConnectClaimTokenError extends Error {
  constructor(public readonly reason: 'invalid' | 'expired' | 'used') {
    super(`Connect claim token is ${reason}`);
    this.name = 'InvalidConnectClaimTokenError';
  }
}

export class ConnectClaimTokenCacheUnavailableError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`Connect claim token cache unavailable during ${operation}`);
    this.name = 'ConnectClaimTokenCacheUnavailableError';
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

@Injectable()
export class ConnectClaimTokenService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async issue(payload: ConnectClaimTokenPayload): Promise<IssuedConnectClaimToken> {
    this.assertCacheAvailable('issue');

    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const mintedAt = Math.floor(Date.now() / 1000);
    const expiresAtEpoch = mintedAt + CONNECT_CLAIM_TOKEN_TTL_SECONDS;
    const entry: StoredEntry = { payload, expiresAt: expiresAtEpoch };

    await this.cacheService.set(this.storageKey(token), JSON.stringify(entry), {
      ttl: CONNECT_CLAIM_TOKEN_TTL_SECONDS,
    });

    return { token, expiresAt: new Date(expiresAtEpoch * 1000).toISOString() };
  }

  /**
   * Reads the stored payload without consuming the token. Used to run the claim
   * merge before marking the token used, so a failed merge can be retried with
   * the same link.
   */
  async verify(token: string): Promise<ConnectClaimTokenPayload> {
    this.assertCacheAvailable('verify');

    if (!this.isTokenFormatValid(token)) {
      throw new InvalidConnectClaimTokenError('invalid');
    }

    let used: string | null | undefined;
    try {
      used = await this.cacheService.get(this.usedKey(token));
    } catch (err) {
      throw new ConnectClaimTokenCacheUnavailableError('verify', err);
    }
    if (used != null) {
      throw new InvalidConnectClaimTokenError('used');
    }

    let raw: string | null | undefined;
    try {
      raw = await this.cacheService.get(this.storageKey(token));
    } catch (err) {
      throw new ConnectClaimTokenCacheUnavailableError('verify', err);
    }
    if (!raw) {
      throw new InvalidConnectClaimTokenError('expired');
    }

    const entry = this.parseEntry(raw);
    if (!entry || !entry.payload.env || !entry.payload.org) {
      throw new InvalidConnectClaimTokenError('invalid');
    }

    return entry.payload;
  }

  /**
   * Atomically claims a token for single-use consumption (GETDEL + used marker).
   * Returns the stored payload, or throws {@link InvalidConnectClaimTokenError}.
   */
  async claim(token: string): Promise<ConnectClaimTokenPayload> {
    this.assertCacheAvailable('claim');

    if (!this.isTokenFormatValid(token)) {
      throw new InvalidConnectClaimTokenError('invalid');
    }

    let raw: string;
    try {
      raw = await this.cacheService.eval<string>(
        CLAIM_ATOMIC_SCRIPT,
        [this.storageKey(token), this.usedKey(token)],
        [Math.floor(Date.now() / 1000)]
      );
    } catch (err) {
      throw new ConnectClaimTokenCacheUnavailableError('claim', err);
    }

    if (raw === 'U') {
      throw new InvalidConnectClaimTokenError('used');
    }

    if (raw === 'I') {
      throw new InvalidConnectClaimTokenError('invalid');
    }

    if (!raw) {
      throw new InvalidConnectClaimTokenError('expired');
    }

    if (raw.charAt(0) !== 'M') {
      throw new InvalidConnectClaimTokenError('invalid');
    }

    const entry = this.parseEntry(raw.slice(1));
    if (!entry || !entry.payload.env || !entry.payload.org) {
      throw new InvalidConnectClaimTokenError('invalid');
    }

    return entry.payload;
  }

  private parseEntry(raw: string): StoredEntry | null {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredEntry>;
      if (!parsed?.payload || typeof parsed.expiresAt !== 'number') {
        return null;
      }

      return { payload: parsed.payload as ConnectClaimTokenPayload, expiresAt: parsed.expiresAt };
    } catch {
      return null;
    }
  }

  private isTokenFormatValid(token: string): boolean {
    return typeof token === 'string' && TOKEN_FORMAT.test(token);
  }

  private assertCacheAvailable(operation: string): void {
    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn(`Cache unavailable for connect claim token ${operation}`);

      throw new ConnectClaimTokenCacheUnavailableError(operation);
    }
  }

  private storageKey(token: string): string {
    return `${CACHE_KEY_PREFIX}${clusterSlotTag(token)}`;
  }

  private usedKey(token: string): string {
    return `${USED_KEY_PREFIX}${clusterSlotTag(token)}`;
  }
}
