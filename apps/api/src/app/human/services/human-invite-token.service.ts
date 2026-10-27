import { ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

import { SingleUseTokenCache } from '../../shared/services/single-use-link-token.service';

/**
 * Lifetime of a `human contact invite` link (seconds). The inviter forwards the link
 * by hand and the person often opens it the next day, so it lives far longer
 * than the Telegram start code (10 min) or Slack OAuth state (5 min) — those
 * are minted fresh from the invite page each time the person picks an app.
 */
export const HUMAN_INVITE_LINK_TTL_SECONDS = 3 * 24 * 60 * 60;

const TOKEN_FORMAT = /^[A-Za-z0-9]{32}$/;

/**
 * Per-contact list of the newest invite links issued to them, so the contacts list can show a
 * pending invite again. It is only for showing: it can miss a link (best effort, and capped), so
 * retiring a contact's links never relies on it. Entries are re-checked against the link before use.
 */
const PENDING_KEY_PREFIX = 'human_invite_pending:';
const MAX_PENDING_LINKS = 10;

/**
 * Per-contact marker written when the contact is removed. Every link issued to them up to that
 * moment reads as declined, whether or not it was ever listed, so an old link can't bring a
 * removed contact back. A link issued afterwards (a new invite) works.
 */
const REVOKED_KEY_PREFIX = 'human_invite_revoked:';

// Redis keeps link keys up to 10% past their stated expiry (jittered TTL); these outlive them.
const CONTACT_KEY_TTL_SECONDS = Math.ceil(HUMAN_INVITE_LINK_TTL_SECONDS * 1.2);

export interface HumanInviteTokenPayload {
  /** Environment id. */
  env: string;
  /** Organization id. */
  org: string;
  /** Relay agent `_id`. */
  agentId: string;
  subscriberId: string;
  /** Epoch milliseconds when the link was issued. Missing on links issued before it was recorded. */
  iat?: number;
}

export interface ActiveHumanInvite {
  payload: HumanInviteTokenPayload;
  /** ISO timestamp when the link expires. */
  expiresAt: string;
}

/** An invite link that still works, as shown next to a contact. */
export interface PendingHumanInvite {
  token: string;
  /** ISO timestamp when the link expires. */
  expiresAt: string;
}

/** Which contact of which relay agent an invite link was issued for. */
export type HumanInviteContactRef = Pick<HumanInviteTokenPayload, 'env' | 'agentId' | 'subscriberId'>;

export type InactiveHumanInviteReason = 'expired' | 'declined' | 'invalid';

export class InactiveHumanInviteError extends Error {
  constructor(public readonly reason: InactiveHumanInviteReason) {
    super(`Human invite link is ${reason}`);
  }
}

export class HumanInviteCacheUnavailableError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`Human invite cache unavailable during ${operation}`);
    this.name = 'HumanInviteCacheUnavailableError';
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * Redis-backed opaque tokens behind the public invite page. The token stays
 * usable (peek) for its whole lifetime so the person can connect several apps
 * and change their default; it is only claimed when they decline, which is
 * why a used token reads as `declined`.
 */
@Injectable()
export class HumanInviteTokenService {
  private readonly tokens: SingleUseTokenCache<HumanInviteTokenPayload>;

  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    logger.setContext(this.constructor.name);
    this.tokens = new SingleUseTokenCache<HumanInviteTokenPayload>({
      cacheService,
      logger,
      scope: 'Human invite link',
      keyPrefix: 'human_invite_link:',
      usedKeyPrefix: 'human_invite_link_used:',
      ttlSeconds: HUMAN_INVITE_LINK_TTL_SECONDS,
      isValidTokenFormat: (token) => typeof token === 'string' && TOKEN_FORMAT.test(token),
      createCacheUnavailableError: (operation, cause) => new HumanInviteCacheUnavailableError(operation, cause),
    });
  }

  async issue(payload: HumanInviteTokenPayload): Promise<{ token: string; expiresAt: string }> {
    const issued = await this.tokens.issue({ ...payload, iat: Date.now() });
    await this.rememberPending(payload, issued);

    return issued;
  }

  /**
   * The newest link that still works for each of the given contacts. Contacts without one are left
   * out. Never throws: the contacts list must still load while the cache is down.
   */
  async findPending(params: {
    environmentId: string;
    agentId: string;
    subscriberIds: string[];
  }): Promise<Map<string, PendingHumanInvite>> {
    const pending = new Map<string, PendingHumanInvite>();

    if (params.subscriberIds.length === 0 || !this.cacheService.cacheEnabled()) {
      return pending;
    }

    try {
      const keys = params.subscriberIds.map((subscriberId) =>
        pendingKey({ env: params.environmentId, agentId: params.agentId, subscriberId })
      );
      const values = await this.cacheService.mget(keys);

      await Promise.all(
        params.subscriberIds.map(async (subscriberId, index) => {
          const invite = await this.newestActive(parsePending(values[index]));

          if (invite) {
            pending.set(subscriberId, invite);
          }
        })
      );
    } catch (err) {
      this.logger.warn({ err }, 'Failed to read pending Human invite links');
    }

    return pending;
  }

  /**
   * Retires every link issued to the contact so far, so a link sent earlier can't reconnect them.
   * The marker is what retires them; it doesn't depend on which links were listed.
   */
  async revokeAll(ref: HumanInviteContactRef): Promise<void> {
    if (!this.cacheService.cacheEnabled()) {
      return;
    }

    try {
      await this.cacheService.set(revokedKey(ref), String(Date.now()), {
        ttl: CONTACT_KEY_TTL_SECONDS,
        jitter: false,
      });
    } catch (err) {
      throw toHttpError(new HumanInviteCacheUnavailableError('revoke', err));
    }

    try {
      await this.cacheService.del(pendingKey(ref));
    } catch (err) {
      this.logger.warn({ err, subscriberId: ref.subscriberId }, 'Failed to clear the listed Human invite links');
    }
  }

  /** Returns the active invite, or throws {@link InactiveHumanInviteError}. */
  async peek(token: string): Promise<ActiveHumanInvite> {
    const outcome = await this.tokens.peek(token);

    switch (outcome.status) {
      case 'active': {
        const { iat, ...payload } = this.validatePayload(outcome.entry.payload);
        const expiresAtMs = outcome.entry.expiresAt * 1000;

        // Redis may keep the key a little past the stated expiry (jittered TTL); the stated one decides.
        if (expiresAtMs <= Date.now()) {
          throw new InactiveHumanInviteError('expired');
        }

        // Links issued before `iat` was recorded carry no issue time; their expiry gives it.
        if (await this.wasRevoked(payload, iat ?? expiresAtMs - HUMAN_INVITE_LINK_TTL_SECONDS * 1000)) {
          throw new InactiveHumanInviteError('declined');
        }

        return { payload, expiresAt: new Date(expiresAtMs).toISOString() };
      }
      case 'used':
        throw new InactiveHumanInviteError('declined');
      case 'missing':
        throw new InactiveHumanInviteError('expired');
      case 'corrupt':
      case 'malformed-token':
        throw new InactiveHumanInviteError('invalid');
      default: {
        const exhaustive: never = outcome;
        throw new Error(`Unhandled peek outcome: ${exhaustive}`);
      }
    }
  }

  /**
   * Retires the link for good after the person declines. Declining twice is a
   * no-op; any other inactive state throws {@link InactiveHumanInviteError}.
   */
  async decline(token: string): Promise<void> {
    const outcome = await this.tokens.claim(token);

    switch (outcome.status) {
      case 'claimed':
      case 'used':
        return;
      case 'missing':
        throw new InactiveHumanInviteError('expired');
      case 'corrupt':
      case 'kind-mismatch':
      case 'malformed-token':
        throw new InactiveHumanInviteError('invalid');
      default: {
        const exhaustive: never = outcome;
        throw new Error(`Unhandled claim outcome: ${exhaustive}`);
      }
    }
  }

  /**
   * Like {@link peek}, but maps inactive links and cache outages to the HTTP
   * errors the public invite actions return (`code` is read by the page).
   */
  async requireActive(token: string): Promise<ActiveHumanInvite> {
    try {
      return await this.peek(token);
    } catch (err) {
      throw toHttpError(err);
    }
  }

  /** A link can be declined, retired or expire early (jittered TTL), so the remembered entry alone is not proof. */
  private async newestActive(invites: PendingHumanInvite[]): Promise<PendingHumanInvite | undefined> {
    for (const invite of [...invites].reverse()) {
      try {
        await this.peek(invite.token);

        return invite;
      } catch (err) {
        if (!(err instanceof InactiveHumanInviteError)) {
          throw err;
        }
      }
    }

    return undefined;
  }

  /** Whether the contact was removed after this link was issued. */
  private async wasRevoked(ref: HumanInviteContactRef, issuedAt: number): Promise<boolean> {
    let revokedAt: number;

    try {
      revokedAt = Number(await this.cacheService.get(revokedKey(ref)));
    } catch (err) {
      throw new HumanInviteCacheUnavailableError('peek', err);
    }

    if (!revokedAt) {
      return false;
    }

    return issuedAt <= revokedAt;
  }

  /**
   * Best effort: a link that could not be remembered still works, it just isn't listed. Two invites
   * at the same moment can also drop one from the list. Only the newest few are kept.
   */
  private async rememberPending(payload: HumanInviteTokenPayload, issued: PendingHumanInvite): Promise<void> {
    const key = pendingKey(payload);

    try {
      const earlier = parsePending(await this.cacheService.get(key));

      await this.cacheService.set(key, JSON.stringify([...earlier, issued].slice(-MAX_PENDING_LINKS)), {
        ttl: CONTACT_KEY_TTL_SECONDS,
        jitter: false,
      });
    } catch (err) {
      this.logger.warn({ err, subscriberId: payload.subscriberId }, 'Failed to remember a Human invite link');
    }
  }

  private validatePayload(payload: HumanInviteTokenPayload): HumanInviteTokenPayload {
    if (!payload.env || !payload.org || !payload.agentId || !payload.subscriberId) {
      throw new InactiveHumanInviteError('invalid');
    }

    return payload;
  }
}

function pendingKey({ env, agentId, subscriberId }: HumanInviteContactRef): string {
  return `${PENDING_KEY_PREFIX}${env}:${agentId}:${subscriberId}`;
}

function revokedKey({ env, agentId, subscriberId }: HumanInviteContactRef): string {
  return `${REVOKED_KEY_PREFIX}${env}:${agentId}:${subscriberId}`;
}

/** The remembered links that have not passed their expiry, oldest first. */
function parsePending(raw: string | null | undefined): PendingHumanInvite[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    const now = Date.now();

    return Array.isArray(parsed)
      ? parsed.filter((entry) => isPendingInvite(entry) && Date.parse(entry.expiresAt) > now)
      : [];
  } catch {
    return [];
  }
}

function isPendingInvite(entry: Partial<PendingHumanInvite> | null): entry is PendingHumanInvite {
  return typeof entry?.token === 'string' && typeof entry?.expiresAt === 'string';
}

export function toHttpError(err: unknown): Error {
  if (err instanceof InactiveHumanInviteError) {
    switch (err.reason) {
      case 'declined':
        return new ConflictException({ code: 'invite_declined', message: 'This invite was declined.' });
      case 'expired':
        return new UnauthorizedException({
          code: 'token_expired',
          message: 'This invite link has expired. Ask whoever sent it for a new one.',
        });
      default:
        return new UnauthorizedException({ code: 'token_invalid', message: 'This invite link is invalid.' });
    }
  }

  if (err instanceof HumanInviteCacheUnavailableError) {
    return new ServiceUnavailableException('Invite links are temporarily unavailable. Try again shortly.');
  }

  return err instanceof Error ? err : new Error(String(err));
}
