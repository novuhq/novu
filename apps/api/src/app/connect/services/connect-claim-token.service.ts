import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { CONNECT_CLAIM_TOKEN_PATTERN } from '@novu/shared';

/**
 * Lifetime of a connect claim token (seconds). The user receives the link in
 * their connected channel after hitting the keyless demo cap and may take a
 * while to sign up, so this is intentionally long-lived (7 days).
 */
export const CONNECT_CLAIM_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const CACHE_KEY_PREFIX = 'connect_claim_link:';
const USED_KEY_PREFIX = 'connect_claim_link_used:';
const ENV_TOKEN_KEY_PREFIX = 'connect_claim_link_env:';
const CTA_POSTED_KEY_PREFIX = 'connect_claim_cta_posted:';
const CLAIM_LOCK_KEY_PREFIX = 'connect_claim_link_lock:';

/** Short lock so concurrent claim requests for the same token serialize. */
const CLAIM_LOCK_TTL_SECONDS = 60;

/** 24 bytes → 32 URL-safe base64url characters. */
const TOKEN_BYTES = 24;

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
   * Returns an existing claim token for the keyless environment when one is still
   * valid, otherwise mints a new one. Prevents unbounded Redis growth when users
   * keep messaging after the demo cap.
   */
  async issueOrGetForEnvironment(payload: ConnectClaimTokenPayload): Promise<IssuedConnectClaimToken> {
    this.assertCacheAvailable('issueOrGetForEnvironment');

    const envKey = `${ENV_TOKEN_KEY_PREFIX}{${payload.env}}`;
    const existingToken = await this.cacheService.get(envKey);

    if (existingToken && this.isTokenFormatValid(existingToken)) {
      const reused = await this.readIssuedToken(existingToken, payload);

      if (reused) {
        return reused;
      }
    }

    const issued = await this.issue(payload);
    await this.cacheService.set(envKey, issued.token, { ttl: CONNECT_CLAIM_TOKEN_TTL_SECONDS });

    return issued;
  }

  /**
   * Marks the signup CTA as posted for a conversation. Returns true only the
   * first time so the card is not re-sent on every subsequent inbound message.
   */
  async tryMarkSignupCtaPosted(conversationId: string): Promise<boolean> {
    this.assertCacheAvailable('tryMarkSignupCtaPosted');

    const key = `${CTA_POSTED_KEY_PREFIX}{${conversationId}}`;
    const acquired = await this.cacheService.setIfNotExist(key, '1', { ttl: CONNECT_CLAIM_TOKEN_TTL_SECONDS });

    return acquired === 'OK';
  }

  /** Serializes concurrent claim attempts for the same token. */
  async tryAcquireClaimLock(token: string): Promise<boolean> {
    this.assertCacheAvailable('tryAcquireClaimLock');

    if (!this.isTokenFormatValid(token)) {
      return false;
    }

    const key = `${CLAIM_LOCK_KEY_PREFIX}${clusterSlotTag(token)}`;
    const acquired = await this.cacheService.setIfNotExist(key, '1', { ttl: CLAIM_LOCK_TTL_SECONDS });

    return acquired === 'OK';
  }

  async releaseClaimLock(token: string): Promise<void> {
    if (!this.cacheService.cacheEnabled() || !this.isTokenFormatValid(token)) {
      return;
    }

    await this.cacheService.del(`${CLAIM_LOCK_KEY_PREFIX}${clusterSlotTag(token)}`);
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

  private async readIssuedToken(
    token: string,
    expectedPayload: ConnectClaimTokenPayload
  ): Promise<IssuedConnectClaimToken | null> {
    const raw = await this.cacheService.get(this.storageKey(token));
    if (!raw) {
      return null;
    }

    const entry = this.parseEntry(raw);
    if (
      !entry ||
      entry.payload.env !== expectedPayload.env ||
      entry.payload.org !== expectedPayload.org
    ) {
      return null;
    }

    return { token, expiresAt: new Date(entry.expiresAt * 1000).toISOString() };
  }

  private isTokenFormatValid(token: string): boolean {
    return typeof token === 'string' && CONNECT_CLAIM_TOKEN_PATTERN.test(token);
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
