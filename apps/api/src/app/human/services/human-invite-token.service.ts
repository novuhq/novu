import { ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

import { SingleUseTokenCache } from '../../shared/services/single-use-link-token.service';

/**
 * Lifetime of a `human invite` link (seconds). The inviter forwards the link
 * by hand and the person often opens it the next day, so it lives far longer
 * than the Telegram start code (10 min) or Slack OAuth state (5 min) — those
 * are minted fresh from the invite page each time the person picks an app.
 */
export const HUMAN_INVITE_LINK_TTL_SECONDS = 3 * 24 * 60 * 60;

const TOKEN_FORMAT = /^[A-Za-z0-9]{32}$/;

export interface HumanInviteTokenPayload {
  /** Environment id. */
  env: string;
  /** Organization id. */
  org: string;
  /** Relay agent `_id`. */
  agentId: string;
  subscriberId: string;
}

export interface ActiveHumanInvite {
  payload: HumanInviteTokenPayload;
  /** ISO timestamp when the link expires. */
  expiresAt: string;
}

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

  constructor(cacheService: CacheService, logger: PinoLogger) {
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
    return this.tokens.issue(payload);
  }

  /** Returns the active invite, or throws {@link InactiveHumanInviteError}. */
  async peek(token: string): Promise<ActiveHumanInvite> {
    const outcome = await this.tokens.peek(token);

    switch (outcome.status) {
      case 'active':
        return {
          payload: this.validatePayload(outcome.entry.payload),
          expiresAt: new Date(outcome.entry.expiresAt * 1000).toISOString(),
        };
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

  private validatePayload(payload: HumanInviteTokenPayload): HumanInviteTokenPayload {
    if (!payload.env || !payload.org || !payload.agentId || !payload.subscriberId) {
      throw new InactiveHumanInviteError('invalid');
    }

    return payload;
  }
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
