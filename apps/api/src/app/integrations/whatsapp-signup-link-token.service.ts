import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

import {
  SingleUseTokenCache,
  SingleUseTokenClaimOutcome,
  SingleUseTokenPeekOutcome,
} from '../shared/services/single-use-link-token.service';

/**
 * Lifetime of an issued WhatsApp signup link token (seconds). Meta Embedded
 * Signup walks the user through a multi-step Facebook dialog (login, business
 * selection, phone verification), and the connect CLI polls signup completion
 * for up to 15 minutes — so this window is deliberately much longer than the
 * 5-minute Telegram mobile-link TTL.
 */
export const WHATSAPP_SIGNUP_LINK_TTL_SECONDS = 30 * 60;

const TOKEN_FORMAT = /^[A-Za-z0-9]{32}$/;

export interface WhatsAppSignupLinkTokenPayload {
  /** Environment id. */
  env: string;
  /** Organization id. */
  org: string;
  /** Agent external identifier. */
  aid: string;
  /** Integration external identifier. */
  iid: string;
}

export interface IssuedWhatsAppSignupLink {
  token: string;
  /** ISO timestamp when this token expires. */
  expiresAt: string;
}

export interface ClaimedWhatsAppSignupLink {
  payload: WhatsAppSignupLinkTokenPayload;
  expiresAt: number;
}

export interface PeekedWhatsAppSignupLink {
  payload: WhatsAppSignupLinkTokenPayload;
  /** True when the completion endpoint already consumed this token. */
  used: boolean;
}

export class InvalidWhatsAppSignupLinkTokenError extends Error {
  constructor(public readonly reason: 'invalid' | 'expired' | 'used') {
    super(`WhatsApp signup link token is ${reason}`);
  }
}

export class WhatsAppSignupLinkCacheUnavailableError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`WhatsApp signup link cache unavailable during ${operation}`);
    this.name = 'WhatsAppSignupLinkCacheUnavailableError';
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * Redis-backed opaque tokens for the public WhatsApp Embedded Signup page,
 * following the Telegram mobile-link pattern: the connect CLI (keyless or
 * authenticated) mints a token bound to an env/org/agent/integration, and the
 * unauthenticated signup page + status endpoints are trusted on that token
 * alone. The completion endpoint claims the token single-use; a completion
 * that fails before credentials are saved releases it so the visitor can
 * retry the same link. The used-marker keeps the payload so status polling
 * survives completion.
 */
@Injectable()
export class WhatsAppSignupLinkTokenService {
  private readonly tokens: SingleUseTokenCache<WhatsAppSignupLinkTokenPayload>;

  constructor(cacheService: CacheService, logger: PinoLogger) {
    logger.setContext(this.constructor.name);
    this.tokens = new SingleUseTokenCache<WhatsAppSignupLinkTokenPayload>({
      cacheService,
      logger,
      scope: 'WhatsApp signup link',
      keyPrefix: 'whatsapp_signup_link:',
      usedKeyPrefix: 'whatsapp_signup_link_used:',
      ttlSeconds: WHATSAPP_SIGNUP_LINK_TTL_SECONDS,
      isValidTokenFormat: (token) => typeof token === 'string' && TOKEN_FORMAT.test(token),
      createCacheUnavailableError: (operation, cause) => new WhatsAppSignupLinkCacheUnavailableError(operation, cause),
    });
  }

  async issue(params: {
    environmentId: string;
    organizationId: string;
    agentIdentifier: string;
    integrationIdentifier: string;
  }): Promise<IssuedWhatsAppSignupLink> {
    return this.tokens.issue({
      env: params.environmentId,
      org: params.organizationId,
      aid: params.agentIdentifier,
      iid: params.integrationIdentifier,
    });
  }

  /**
   * Reads the stored payload without consuming the token. Consumed tokens
   * still resolve (with `used: true`) for as long as the original TTL lasts,
   * so status polling keeps working after a successful completion.
   */
  async peek(token: string): Promise<PeekedWhatsAppSignupLink> {
    const outcome = await this.tokens.peek(token);

    switch (outcome.status) {
      case 'active':
        return { payload: this.validatePayload(outcome.entry.payload), used: false };
      case 'used': {
        if (!outcome.entry) {
          throw new InvalidWhatsAppSignupLinkTokenError('invalid');
        }

        return { payload: this.validatePayload(outcome.entry.payload), used: true };
      }
      case 'missing':
        throw new InvalidWhatsAppSignupLinkTokenError('expired');
      case 'corrupt':
      case 'malformed-token':
        throw new InvalidWhatsAppSignupLinkTokenError('invalid');
      default: {
        const exhaustive: never = outcome;
        throw new Error(`Unhandled peek outcome: ${exhaustive}`);
      }
    }
  }

  /**
   * Atomically claims a token for single-use consumption (GETDEL + used
   * marker carrying the payload). Returns the stored entry, or throws
   * {@link InvalidWhatsAppSignupLinkTokenError}.
   */
  async claim(token: string): Promise<ClaimedWhatsAppSignupLink> {
    const outcome = await this.tokens.claim(token);

    switch (outcome.status) {
      case 'claimed':
        return { payload: this.validatePayload(outcome.entry.payload), expiresAt: outcome.entry.expiresAt };
      case 'used':
        throw new InvalidWhatsAppSignupLinkTokenError('used');
      case 'missing':
        throw new InvalidWhatsAppSignupLinkTokenError('expired');
      case 'corrupt':
      case 'kind-mismatch':
      case 'malformed-token':
        throw new InvalidWhatsAppSignupLinkTokenError('invalid');
      default: {
        const exhaustive: never = outcome;
        throw new Error(`Unhandled claim outcome: ${exhaustive}`);
      }
    }
  }

  /**
   * Re-stores a token after a failed completion so the visitor can retry the
   * same link.
   */
  async release(token: string, claimed: ClaimedWhatsAppSignupLink): Promise<void> {
    await this.tokens.release(token, claimed);
  }

  private validatePayload(payload: WhatsAppSignupLinkTokenPayload): WhatsAppSignupLinkTokenPayload {
    if (!payload.env || !payload.org || !payload.aid || !payload.iid) {
      throw new InvalidWhatsAppSignupLinkTokenError('invalid');
    }

    return payload;
  }
}
