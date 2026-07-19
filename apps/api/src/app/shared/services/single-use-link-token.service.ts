import { CacheService, PinoLogger } from '@novu/application-generic';

import { mintAutolinkSafeOpaqueToken } from '../helpers';

/** Wrap token in `{…}` so storage + used-marker keys share a Redis Cluster hash slot. */
function clusterSlotTag(token: string): string {
  return `{${token}}`;
}

/**
 * Atomically GETDEL the stored entry and copy it into the used-marker with
 * matching TTL. The used-marker keeps the full entry JSON (not just a flag) so
 * callers can keep resolving the payload after consumption (e.g. status
 * polling). When ARGV[2] is non-empty the payload `kind` must match; on
 * mismatch the entry is restored so a claim with the wrong kind does not burn
 * the token.
 * Returns '' (missing), 'U' (already used), 'I' (corrupt payload), 'K' (kind
 * mismatch; entry restored), or 'M' + JSON body.
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
if ARGV[2] ~= '' then
  if not parsed.payload.kind then
    return 'I'
  end
  if parsed.payload.kind ~= ARGV[2] then
    local now = tonumber(ARGV[1])
    local ttl = parsed.expiresAt - now
    if ttl < 1 then ttl = 1 end
    redis.call('SET', KEYS[1], raw, 'EX', ttl)
    return 'K'
  end
end
local now = tonumber(ARGV[1])
local ttl = parsed.expiresAt - now
if ttl < 1 then ttl = 1 end
redis.call('SET', KEYS[2], raw, 'EX', ttl)
return 'M' .. raw
`;

/** Atomically restore the stored entry and clear the used-marker. */
const RELEASE_ATOMIC_SCRIPT = `
redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2]))
redis.call('DEL', KEYS[2])
`;

export interface StoredTokenEntry<TPayload> {
  payload: TPayload;
  /** Epoch seconds when this entry naturally expires. */
  expiresAt: number;
}

export interface IssuedSingleUseToken {
  token: string;
  /** ISO timestamp when this token expires. */
  expiresAt: string;
}

export type SingleUseTokenClaimOutcome<TPayload> =
  | { status: 'claimed'; entry: StoredTokenEntry<TPayload> }
  /** No stored entry and no used-marker — the token expired or never existed. */
  | { status: 'missing' }
  | { status: 'used' }
  | { status: 'corrupt' }
  /** Stored payload `kind` did not match the expected kind; the entry was restored. */
  | { status: 'kind-mismatch' }
  | { status: 'malformed-token' };

export type SingleUseTokenPeekOutcome<TPayload> =
  | { status: 'active'; entry: StoredTokenEntry<TPayload> }
  /** Consumed token. `entry` is null when the used-marker predates payload-bearing markers. */
  | { status: 'used'; entry: StoredTokenEntry<TPayload> | null }
  | { status: 'missing' }
  | { status: 'corrupt' }
  | { status: 'malformed-token' };

export interface SingleUseTokenCacheOptions {
  cacheService: CacheService;
  logger: PinoLogger;
  /** Human-readable label used in log messages, e.g. 'WhatsApp signup link'. */
  scope: string;
  /** Redis key prefix for active entries, e.g. 'whatsapp_signup_link:'. */
  keyPrefix: string;
  /** Redis key prefix for used-markers, e.g. 'whatsapp_signup_link_used:'. */
  usedKeyPrefix: string;
  ttlSeconds: number;
  isValidTokenFormat: (token: string) => boolean;
  /** Domain error thrown whenever Redis is disabled or a cache operation fails. */
  createCacheUnavailableError: (operation: string, cause?: unknown) => Error;
}

/**
 * Redis-backed opaque single-use link tokens: issue stores a payload under a
 * minted token with a TTL, claim consumes it atomically (leaving a used-marker
 * carrying the entry), peek reads without consuming, and release restores a
 * claimed entry so a failed consume can be retried.
 *
 * This is the shared kernel behind the WhatsApp signup-link, Telegram
 * mobile-link, and connect-claim token services. Methods report outcomes as
 * discriminated unions (never domain errors) so each owning service maps them
 * onto its own error vocabulary.
 */
export class SingleUseTokenCache<TPayload> {
  constructor(private readonly options: SingleUseTokenCacheOptions) {}

  async issue(payload: TPayload): Promise<IssuedSingleUseToken> {
    this.assertCacheAvailable('issue');

    const token = mintAutolinkSafeOpaqueToken();
    const mintedAt = Math.floor(Date.now() / 1000);
    const expiresAtEpoch = mintedAt + this.options.ttlSeconds;
    const entry: StoredTokenEntry<TPayload> = { payload, expiresAt: expiresAtEpoch };

    await this.options.cacheService.set(this.storageKey(token), JSON.stringify(entry), {
      ttl: this.options.ttlSeconds,
    });

    return { token, expiresAt: new Date(expiresAtEpoch * 1000).toISOString() };
  }

  /** Reads the stored entry (or the used-marker copy) without consuming the token. */
  async peek(token: string): Promise<SingleUseTokenPeekOutcome<TPayload>> {
    if (!this.options.isValidTokenFormat(token)) {
      return { status: 'malformed-token' };
    }

    this.assertCacheAvailable('peek');

    const raw = await this.getOrThrow(this.storageKey(token), 'peek');
    if (raw) {
      const entry = this.parseEntry(raw);

      return entry ? { status: 'active', entry } : { status: 'corrupt' };
    }

    const usedRaw = await this.getOrThrow(this.usedKey(token), 'peek');
    if (usedRaw) {
      return { status: 'used', entry: this.parseEntry(usedRaw) };
    }

    return { status: 'missing' };
  }

  /**
   * Atomically claims a token for single-use consumption (GETDEL + used-marker
   * carrying the entry). When `expectedKind` is provided the stored payload's
   * `kind` field must match, otherwise the entry is restored.
   */
  async claim(token: string, expectedKind?: string): Promise<SingleUseTokenClaimOutcome<TPayload>> {
    if (!this.options.isValidTokenFormat(token)) {
      return { status: 'malformed-token' };
    }

    this.assertCacheAvailable('claim');

    let raw: string;
    try {
      raw = await this.options.cacheService.eval<string>(
        CLAIM_ATOMIC_SCRIPT,
        [this.storageKey(token), this.usedKey(token)],
        [Math.floor(Date.now() / 1000), expectedKind ?? '']
      );
    } catch (err) {
      throw this.options.createCacheUnavailableError('claim', err);
    }

    if (raw === 'U') {
      return { status: 'used' };
    }

    if (raw === 'I') {
      return { status: 'corrupt' };
    }

    if (raw === 'K') {
      return { status: 'kind-mismatch' };
    }

    if (!raw) {
      return { status: 'missing' };
    }

    if (raw.charAt(0) !== 'M') {
      return { status: 'corrupt' };
    }

    const entry = this.parseEntry(raw.slice(1));

    return entry ? { status: 'claimed', entry } : { status: 'corrupt' };
  }

  /** Re-stores a claimed entry (clearing the used-marker) so the visitor can retry the same link. */
  async release(token: string, entry: StoredTokenEntry<TPayload>): Promise<void> {
    if (!this.options.isValidTokenFormat(token) || !this.options.cacheService.cacheEnabled()) {
      return;
    }

    const remaining = entry.expiresAt - Math.floor(Date.now() / 1000);
    if (remaining <= 0) {
      return;
    }

    const stored: StoredTokenEntry<TPayload> = { payload: entry.payload, expiresAt: entry.expiresAt };

    try {
      await this.options.cacheService.eval(
        RELEASE_ATOMIC_SCRIPT,
        [this.storageKey(token), this.usedKey(token)],
        [JSON.stringify(stored), remaining]
      );
    } catch (err) {
      this.options.logger.warn(
        { err, storageKey: this.storageKey(token), usedKey: this.usedKey(token) },
        `Failed to release ${this.options.scope} token`
      );
      throw this.options.createCacheUnavailableError('release', err);
    }
  }

  /** Returns whether a token was already consumed (used-marker present). */
  async isTokenUsed(token: string): Promise<boolean> {
    if (!this.options.isValidTokenFormat(token) || !this.options.cacheService.cacheEnabled()) {
      return false;
    }

    const value = await this.getOrThrow(this.usedKey(token), 'isTokenUsed');

    return value != null;
  }

  private async getOrThrow(key: string, operation: string): Promise<string | null | undefined> {
    try {
      return await this.options.cacheService.get(key);
    } catch (err) {
      throw this.options.createCacheUnavailableError(operation, err);
    }
  }

  private parseEntry(raw: string): StoredTokenEntry<TPayload> | null {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredTokenEntry<TPayload>>;
      if (!parsed?.payload || typeof parsed.expiresAt !== 'number') {
        return null;
      }

      return { payload: parsed.payload, expiresAt: parsed.expiresAt };
    } catch {
      return null;
    }
  }

  private assertCacheAvailable(operation: string): void {
    if (!this.options.cacheService.cacheEnabled()) {
      this.options.logger.warn(`Cache unavailable for ${this.options.scope} ${operation}`);

      throw this.options.createCacheUnavailableError(operation);
    }
  }

  private storageKey(token: string): string {
    return `${this.options.keyPrefix}${clusterSlotTag(token)}`;
  }

  private usedKey(token: string): string {
    return `${this.options.usedKeyPrefix}${clusterSlotTag(token)}`;
  }
}
