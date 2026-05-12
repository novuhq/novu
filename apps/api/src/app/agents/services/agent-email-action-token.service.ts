import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

const KEY_PREFIX = 'agent:email:action:';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 3; // 3 days
/** 256 bits of entropy. Encoded as base64url → 43 URL-safe characters. */
const TOKEN_BYTES = 32;

/**
 * Action context forwarded to the agent's `onAction` handler when a recipient clicks an
 * email button. Stored server-side keyed by an opaque token so none of these fields ever
 * appear in the URL — internal IDs (`environmentId`, `organizationId`, `agentId`) and the
 * recipient address (`userIdentifier`) would otherwise be readable by any party that sees
 * the link (corporate email scanners, server logs, browser history, mail archives).
 */
export interface AgentEmailActionClaims {
  /** Mongo `_id` of the agent. Used to look up cached chat instance + resolve config. */
  agentId: string;
  /** Stable agent identifier slug (mirrors what the dashboard URLs use). */
  agentIdentifier: string;
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
  /** Email address of the recipient — used as `platformUserId` for subscriber resolution. */
  userIdentifier: string;
}

interface StoredEntry {
  claims: AgentEmailActionClaims;
  /** Epoch seconds when the entry was due to naturally expire. Used to recompute the
   *  remaining TTL when a token is restored after a transient dispatch failure. */
  expiresAt: number;
}

/** Returned from `consumeActionToken`; carries `expiresAt` so a transient failure can
 *  re-store the entry without extending its lifetime past the original expiry. */
export interface ConsumedActionToken {
  claims: AgentEmailActionClaims;
  expiresAt: number;
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
    const expiresAt = Math.floor(Date.now() / 1000) + this.ttlSeconds;
    const entry: StoredEntry = { claims, expiresAt };

    await this.cacheService.set(this.storageKey(token), JSON.stringify(entry), { ttl: this.ttlSeconds });

    const base = (process.env.API_ROOT_URL ?? '').replace(/\/$/, '');
    if (!base) {
      throw new Error('API_ROOT_URL is not configured — cannot build email action URL');
    }
    const url = `${base}/v1/agents/email/actions/preview?t=${encodeURIComponent(token)}`;

    return { token, url };
  }

  /**
   * Reads the claims **without** consuming the token. Used by the GET preview route so a
   * URL prefetcher (or repeated browser visit) doesn't burn the single-use reservation.
   */
  async peekActionToken(token: string): Promise<AgentEmailActionClaims | null> {
    const raw = await this.cacheService.get(this.storageKey(token));
    if (!raw) return null;

    return this.parseEntry(raw)?.claims ?? null;
  }

  /**
   * Atomically reads **and deletes** the entry. This is the single-use claim — only one
   * caller wins per token; later callers see `null` and the controller renders the
   * "already submitted" page. If downstream dispatch fails transiently, call
   * `releaseActionToken` to put the entry back so the user can retry from the same link.
   */
  async consumeActionToken(token: string): Promise<ConsumedActionToken | null> {
    const client = this.cacheService.client;
    if (!client) {
      this.logger.error('Cache client unavailable — cannot consume agent email action token');

      return null;
    }

    // GETDEL: atomic read+delete (Redis 6.2+, native ioredis support).
    const raw = await client.getdel(this.storageKey(token));
    if (!raw) return null;

    const entry = this.parseEntry(raw);

    return entry ? { claims: entry.claims, expiresAt: entry.expiresAt } : null;
  }

  /**
   * Re-stores a token previously taken by `consumeActionToken` so the user can retry after
   * a transient dispatch failure. The remaining TTL is re-computed against the original
   * `expiresAt` so a token can never outlive its natural expiry. No-op if the original
   * expiry has already passed.
   */
  async releaseActionToken(token: string, consumed: ConsumedActionToken): Promise<void> {
    const remaining = consumed.expiresAt - Math.floor(Date.now() / 1000);
    if (remaining <= 0) return;

    const entry: StoredEntry = { claims: consumed.claims, expiresAt: consumed.expiresAt };
    await this.cacheService.set(this.storageKey(token), JSON.stringify(entry), { ttl: remaining });
  }

  private storageKey(token: string): string {
    return `${KEY_PREFIX}${token}`;
  }

  private parseEntry(raw: string): StoredEntry | null {
    try {
      const parsed = JSON.parse(raw) as StoredEntry;
      if (!parsed || typeof parsed !== 'object' || !parsed.claims || typeof parsed.expiresAt !== 'number') {
        return null;
      }

      return parsed;
    } catch (err) {
      this.logger.warn({ err }, 'Failed to parse stored agent email action token entry');

      return null;
    }
  }
}
