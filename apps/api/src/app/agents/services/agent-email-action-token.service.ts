import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

const KEY_PREFIX = 'agent:email:action:';
const MESSAGE_KEY_PREFIX = 'agent:email:action:msg:';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 3; // 3 days
/** 256 bits of entropy. Encoded as base64url → 43 URL-safe characters. */
const TOKEN_BYTES = 32;
/** Hosts where plaintext HTTP is acceptable because the link never leaves the developer's
 *  loopback interface. Every other host must use https — the action token is bearer
 *  authority and intercepting it in transit is equivalent to dispatching the action. */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Action context forwarded to the agent's `onAction` handler when a recipient clicks an
 * email button. Stored server-side keyed by an opaque token so none of these fields ever
 * appear in the URL — internal IDs (`environmentId`, `organizationId`, `agentId`) and the
 * recipient address (`userIdentifier`) would otherwise be readable by any party that sees
 * the link (corporate email scanners, server logs, browser history, mail archives).
 */
export type AgentEmailActionStyle = 'primary' | 'danger' | 'default';

export interface AgentEmailActionClaims {
  /** Mongo `_id` of the agent. Used to look up cached chat instance + resolve config. */
  agentId: string;
  /** Stable agent identifier slug (mirrors what the dashboard URLs use). */
  agentIdentifier: string;
  /** Human-readable agent display name; shown on the confirmation page. */
  agentName: string;
  integrationIdentifier: string;
  environmentId: string;
  organizationId: string;
  /** Encoded thread id from the email adapter's ThreadResolver. */
  threadId: string;
  /** RFC-5322 Message-ID of the email the button was rendered in. */
  messageId: string;
  /** `id` of the clicked `<Button>` — forwarded to onAction. */
  actionId: string;
  /** Optional `value` of the clicked `<Button>` — forwarded to onAction. */
  value?: string;
  /** Display label shown on the confirmation page; not security-sensitive. */
  label?: string;
  /** Echoes the source `<Button style="…">`. Drives the destructive-action UI on the
   *  confirmation page (red button + "cannot be undone" copy) when `'danger'`. */
  style?: AgentEmailActionStyle;
  /** Email address of the recipient — used as `platformUserId` for subscriber resolution. */
  userIdentifier: string;
}

interface StoredEntry {
  claims: AgentEmailActionClaims;
  /** Epoch seconds when the entry was due to naturally expire. Used to recompute the
   *  remaining TTL when a token is restored after a transient dispatch failure. */
  expiresAt: number;
  /** Epoch seconds when the token was minted. Surfaced through peek/consume so the
   *  confirmation page can show a relative "Sent N min ago" footer. */
  mintedAt: number;
}

/** Returned from `peekActionToken` and `consumeActionToken`. Carries `expiresAt` so a
 *  transient failure can re-store the entry without extending its lifetime past the
 *  original expiry, and `mintedAt` for relative-time rendering. */
export interface PeekedActionToken {
  claims: AgentEmailActionClaims;
  expiresAt: number;
  mintedAt: number;
}

export type ConsumedActionToken = PeekedActionToken;

/**
 * Thrown when the Redis-backed action-token cache is unreachable. Distinguishable from a
 * null `peek`/`consume` result (which means "expired or already used") so the controller
 * can render a retryable "try again" page instead of the terminal "already submitted"
 * page that would otherwise silently drop valid clicks during a cache outage.
 */
export class AgentEmailActionCacheUnavailableError extends Error {
  readonly cacheUnavailable = true as const;

  constructor(operation: 'peek' | 'consume' | 'release', cause?: unknown) {
    super(`Agent email action token cache unavailable during ${operation}`);
    this.name = 'AgentEmailActionCacheUnavailableError';
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

@Injectable()
export class AgentEmailActionTokenService {
  private readonly ttlSeconds: number;

  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
    const raw = process.env.AGENT_EMAIL_ACTION_TOKEN_TTL;
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    this.ttlSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS;
  }

  /**
   * Mints a fresh opaque action token and stores the full claims server-side. The URL
   * embedded in the email body carries only the random token, never the claims themselves.
   */
  async signActionToken(claims: AgentEmailActionClaims): Promise<{ token: string; url: string }> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const mintedAt = Math.floor(Date.now() / 1000);
    const expiresAt = mintedAt + this.ttlSeconds;
    const entry: StoredEntry = { claims, expiresAt, mintedAt };

    await this.cacheService.set(this.storageKey(token), JSON.stringify(entry), { ttl: this.ttlSeconds });

    const url = `${this.resolveApiBaseUrl()}/v1/agents/email/actions/preview?t=${encodeURIComponent(token)}`;

    return { token, url };
  }

  /**
   * Resolves and validates the API base URL from `API_ROOT_URL`. Throws when the env var
   * is unset, malformed, or carries a non-https scheme on a non-loopback host — the latter
   * because the action token in the URL grants action-execution authority and must not
   * travel over plaintext HTTP. Loopback hosts are exempted so local development works
   * with `API_ROOT_URL=http://127.0.0.1:3000`.
   */
  private resolveApiBaseUrl(): string {
    const baseRaw = (process.env.API_ROOT_URL ?? '').replace(/\/$/, '');
    if (!baseRaw) {
      throw new Error('API_ROOT_URL is not configured — cannot build email action URL');
    }

    let parsed: URL;
    try {
      parsed = new URL(baseRaw);
    } catch {
      throw new Error(`API_ROOT_URL is not a valid URL: ${baseRaw}`);
    }

    const isLoopback = LOOPBACK_HOSTS.has(parsed.hostname);
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback)) {
      throw new Error(
        `API_ROOT_URL must use https:// (got ${parsed.protocol}//${parsed.hostname}). ` +
          'Email action tokens grant action-execution authority and must not travel over plaintext HTTP.'
      );
    }

    return baseRaw;
  }

  /**
   * Reads the claims **without** consuming the token. Used by the GET preview route so a
   * URL prefetcher (or repeated browser visit) doesn't burn the single-use reservation.
   *
   * Returns `null` when the message's group flag has already been claimed by a sibling
   * button in the same email — clicking Approve invalidates Deny, so the user landing on
   * Deny's preview link should see the same "already submitted / expired" terminal page as
   * if they reused a consumed link.
   *
   * @throws AgentEmailActionCacheUnavailableError when Redis is unreachable — distinct from
   *   a `null` return (which means "expired or already used") so the controller can render
   *   a retryable error instead of silently dropping the click.
   */
  async peekActionToken(token: string): Promise<PeekedActionToken | null> {
    let raw: string | null | undefined;
    try {
      raw = await this.cacheService.get(this.storageKey(token));
    } catch (err) {
      throw new AgentEmailActionCacheUnavailableError('peek', err);
    }
    if (!raw) return null;

    const entry = this.parseEntry(raw);
    if (!entry) return null;

    let messageClaimed: string | null | undefined;
    try {
      messageClaimed = await this.cacheService.get(this.messageKey(entry.claims.messageId));
    } catch (err) {
      throw new AgentEmailActionCacheUnavailableError('peek', err);
    }
    if (messageClaimed) return null;

    return { claims: entry.claims, expiresAt: entry.expiresAt, mintedAt: entry.mintedAt };
  }

  /**
   * Atomically reads **and deletes** the entry. This is the single-use claim — only one
   * caller wins per token; later callers see `null` and the controller renders the
   * "already submitted" page. If downstream dispatch fails transiently, call
   * `releaseActionToken` to put the entry back so the user can retry from the same link.
   *
   * After the per-token GETDEL succeeds, the *message-level* group flag is claimed via
   * `SET NX` keyed on the email's Message-ID so that every sibling button rendered in the
   * same email stops working too — i.e. clicking Approve invalidates Deny. If a concurrent
   * sibling already won the race for the flag (extremely narrow window: both buttons
   * clicked within the same Redis round-trip), the per-token entry stays deleted and we
   * return `null` so the loser sees "already submitted". We intentionally do not restore
   * the loser's entry, since the message is already in its terminal state and reviving one
   * orphan would only enable a spurious second peek/consume on the loser's link.
   *
   * @throws AgentEmailActionCacheUnavailableError when Redis is unreachable — distinct from
   *   a `null` return so the controller can render a retryable error instead of silently
   *   dropping valid clicks during an outage.
   */
  async consumeActionToken(token: string): Promise<ConsumedActionToken | null> {
    const client = this.cacheService.client;
    if (!client) {
      throw new AgentEmailActionCacheUnavailableError('consume');
    }

    // GETDEL: atomic read+delete (Redis 6.2+, native ioredis support).
    let raw: string | null;
    try {
      raw = await client.getdel(this.storageKey(token));
    } catch (err) {
      throw new AgentEmailActionCacheUnavailableError('consume', err);
    }
    if (!raw) return null;

    const entry = this.parseEntry(raw);
    if (!entry) return null;

    const remaining = entry.expiresAt - Math.floor(Date.now() / 1000);
    // The message-level flag mirrors the natural per-token TTL so it auto-expires alongside
    // the siblings. Clamp to >=1s — Redis rejects zero/negative TTLs on SET EX.
    const messageTtl = Math.max(1, remaining);
    let claimed: 'OK' | null;
    try {
      claimed = await client.set(this.messageKey(entry.claims.messageId), '1', 'EX', messageTtl, 'NX');
    } catch (err) {
      throw new AgentEmailActionCacheUnavailableError('consume', err);
    }

    if (claimed !== 'OK') {
      // A sibling beat us to the message-level claim. The per-token entry is already gone;
      // the message is in its terminal "consumed" state. Surface as "already submitted".
      return null;
    }

    return { claims: entry.claims, expiresAt: entry.expiresAt, mintedAt: entry.mintedAt };
  }

  /**
   * Re-stores a token previously taken by `consumeActionToken` so the user can retry after
   * a transient dispatch failure. The remaining TTL is re-computed against the original
   * `expiresAt` so a token can never outlive its natural expiry. No-op if the original
   * expiry has already passed. Also clears the message-level consumed flag set by
   * `consume`, so sibling buttons in the same email are usable again — symmetric with the
   * consume path.
   */
  async releaseActionToken(token: string, consumed: ConsumedActionToken): Promise<void> {
    const remaining = consumed.expiresAt - Math.floor(Date.now() / 1000);
    if (remaining <= 0) return;

    const entry: StoredEntry = {
      claims: consumed.claims,
      expiresAt: consumed.expiresAt,
      mintedAt: consumed.mintedAt,
    };
    await this.cacheService.set(this.storageKey(token), JSON.stringify(entry), { ttl: remaining });
    await this.cacheService.del(this.messageKey(consumed.claims.messageId));
  }

  private storageKey(token: string): string {
    return `${KEY_PREFIX}${token}`;
  }

  private messageKey(messageId: string): string {
    return `${MESSAGE_KEY_PREFIX}${messageId}`;
  }

  private parseEntry(raw: string): StoredEntry | null {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredEntry>;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !parsed.claims ||
        typeof parsed.expiresAt !== 'number' ||
        typeof parsed.mintedAt !== 'number'
      ) {
        return null;
      }

      return parsed as StoredEntry;
    } catch (err) {
      this.logger.warn({ err }, 'Failed to parse stored agent email action token entry');

      return null;
    }
  }
}
