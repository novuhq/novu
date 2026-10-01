import { ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { HumanChannelViaEnum } from '@novu/shared';

import { SingleUseTokenCache } from '../../shared/services/single-use-link-token.service';

/** Lifetime of a verification link (seconds). Shorter than invite links — the person has the inbox open. */
export const HUMAN_VERIFICATION_LINK_TTL_SECONDS = 24 * 60 * 60;

const TOKEN_FORMAT = /^[A-Za-z0-9]{32}$/;

export interface HumanVerificationTokenPayload {
  env: string;
  org: string;
  agentId: string;
  subscriberId: string;
  via: HumanChannelViaEnum;
  /** Normalized address the link confirms. */
  address: string;
}

export interface ClaimedHumanVerification {
  payload: HumanVerificationTokenPayload;
  expiresAt: string;
}

export type InactiveHumanVerificationReason = 'expired' | 'used' | 'invalid';

export class InactiveHumanVerificationError extends Error {
  constructor(public readonly reason: InactiveHumanVerificationReason) {
    super(`Human verification link is ${reason}`);
  }
}

export class HumanVerificationCacheUnavailableError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`Human verification cache unavailable during ${operation}`);
    this.name = 'HumanVerificationCacheUnavailableError';
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * Redis-backed opaque tokens behind the "Verify this email" button. Single-use:
 * claiming burns the link so the same click can't re-promote a pending address.
 */
@Injectable()
export class HumanVerificationTokenService {
  private readonly tokens: SingleUseTokenCache<HumanVerificationTokenPayload>;

  constructor(cacheService: CacheService, logger: PinoLogger) {
    logger.setContext(this.constructor.name);
    this.tokens = new SingleUseTokenCache<HumanVerificationTokenPayload>({
      cacheService,
      logger,
      scope: 'Human verification link',
      keyPrefix: 'human_verify:',
      usedKeyPrefix: 'human_verify_used:',
      ttlSeconds: HUMAN_VERIFICATION_LINK_TTL_SECONDS,
      isValidTokenFormat: (token) => typeof token === 'string' && TOKEN_FORMAT.test(token),
      createCacheUnavailableError: (operation, cause) => new HumanVerificationCacheUnavailableError(operation, cause),
    });
  }

  async issue(payload: HumanVerificationTokenPayload): Promise<{ token: string; expiresAt: string }> {
    return this.tokens.issue(payload);
  }

  /**
   * Puts a claimed link back so the same click can retry after a failed write.
   * No-op when the link has already expired.
   */
  async release(token: string, claimed: ClaimedHumanVerification): Promise<void> {
    const expiresAt = Math.floor(Date.parse(claimed.expiresAt) / 1000);
    if (!Number.isFinite(expiresAt)) {
      return;
    }

    await this.tokens.release(token, { payload: claimed.payload, expiresAt });
  }

  /** Claims the link. Throws {@link InactiveHumanVerificationError} when inactive. */
  async claim(token: string): Promise<ClaimedHumanVerification> {
    const outcome = await this.tokens.claim(token);

    switch (outcome.status) {
      case 'claimed':
        return {
          payload: this.validatePayload(outcome.entry.payload),
          expiresAt: new Date(outcome.entry.expiresAt * 1000).toISOString(),
        };
      case 'used':
        throw new InactiveHumanVerificationError('used');
      case 'missing':
        throw new InactiveHumanVerificationError('expired');
      case 'corrupt':
      case 'kind-mismatch':
      case 'malformed-token':
        throw new InactiveHumanVerificationError('invalid');
      default: {
        const exhaustive: never = outcome;
        throw new Error(`Unhandled claim outcome: ${exhaustive}`);
      }
    }
  }

  private validatePayload(payload: HumanVerificationTokenPayload): HumanVerificationTokenPayload {
    if (!payload.env || !payload.org || !payload.agentId || !payload.subscriberId || !payload.via || !payload.address) {
      throw new InactiveHumanVerificationError('invalid');
    }

    return payload;
  }
}

export function toVerificationHttpError(err: unknown): Error {
  if (err instanceof InactiveHumanVerificationError) {
    switch (err.reason) {
      case 'used':
        return new ConflictException({
          code: 'verification_used',
          message: 'This verification link was already used.',
        });
      case 'expired':
        return new UnauthorizedException({
          code: 'token_expired',
          message: 'This verification link has expired. Ask whoever invited you to resend it.',
        });
      default:
        return new UnauthorizedException({
          code: 'token_invalid',
          message: 'This verification link is invalid.',
        });
    }
  }

  if (err instanceof HumanVerificationCacheUnavailableError) {
    return new ServiceUnavailableException('Verification links are temporarily unavailable. Try again shortly.');
  }

  return err instanceof Error ? err : new Error(String(err));
}
