import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CacheService, PinoLogger } from '@novu/application-generic';

/** Lifetime of an issued mobile setup token (seconds). */
export const TELEGRAM_MOBILE_LINK_TTL_SECONDS = 5 * 60;

/** Cache TTL for the used-jti blocklist. Slightly larger than the JWT TTL to outlive clock skew. */
const USED_JTI_TTL_SECONDS = TELEGRAM_MOBILE_LINK_TTL_SECONDS + 60;

const JWT_AUDIENCE = 'telegram-mobile-setup';
const JWT_AUDIENCE_INTEGRATION_STORE = 'telegram-integration-mobile-setup';
const JWT_ISSUER = 'novu';

const USED_JTI_KEY_PREFIX = 'telegram_mobile_jti:';

export interface TelegramMobileLinkTokenPayload {
  /** Environment id. */
  env: string;
  /** Organization id. */
  org: string;
  /** Agent external identifier. */
  aid: string;
  /** Integration id (internal Mongo `_id`). */
  iid: string;
  /** Unique token id used for single-use enforcement. */
  jti: string;
  /** Issued-at (seconds since epoch). */
  iat?: number;
  /** Expiry (seconds since epoch). */
  exp?: number;
  aud?: string;
  iss?: string;
}

/**
 * Payload for the agent-less integration-store flow. The consumer creates a
 * brand-new Telegram integration on submit, so no integration or agent id is
 * known at issue time.
 */
export interface IntegrationStoreTelegramMobileLinkPayload {
  env: string;
  org: string;
  jti: string;
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
}

export interface IssuedTelegramMobileLink {
  token: string;
  /** ISO timestamp when this token expires. */
  expiresAt: string;
}

export class InvalidTelegramMobileTokenError extends Error {
  constructor(public readonly reason: 'invalid' | 'expired' | 'used') {
    super(`Telegram mobile token is ${reason}`);
  }
}

@Injectable()
export class TelegramMobileLinkTokenService {
  constructor(
    private readonly jwtService: JwtService,
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
  }): Promise<IssuedTelegramMobileLink> {
    const jti = randomUUID();

    const payload: TelegramMobileLinkTokenPayload = {
      env: params.environmentId,
      org: params.organizationId,
      aid: params.agentIdentifier,
      iid: params.integrationId,
      jti,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: TELEGRAM_MOBILE_LINK_TTL_SECONDS,
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    });

    const expiresAt = new Date(Date.now() + TELEGRAM_MOBILE_LINK_TTL_SECONDS * 1000).toISOString();

    return { token, expiresAt };
  }

  /**
   * Verifies the JWT signature, audience, issuer and expiry.
   * Returns the decoded payload, or throws {@link InvalidTelegramMobileTokenError}.
   */
  verify(token: string): TelegramMobileLinkTokenPayload {
    if (!token || typeof token !== 'string') {
      throw new InvalidTelegramMobileTokenError('invalid');
    }

    try {
      const payload = this.jwtService.verify<TelegramMobileLinkTokenPayload>(token, {
        audience: JWT_AUDIENCE,
        issuer: JWT_ISSUER,
      });

      if (!payload?.env || !payload?.org || !payload?.aid || !payload?.iid || !payload?.jti) {
        throw new InvalidTelegramMobileTokenError('invalid');
      }

      return payload;
    } catch (err) {
      if (err instanceof InvalidTelegramMobileTokenError) throw err;
      const isExpired =
        typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'TokenExpiredError';
      throw new InvalidTelegramMobileTokenError(isExpired ? 'expired' : 'invalid');
    }
  }

  async issueForIntegrationStore(params: {
    environmentId: string;
    organizationId: string;
  }): Promise<IssuedTelegramMobileLink> {
    const jti = randomUUID();

    const payload: IntegrationStoreTelegramMobileLinkPayload = {
      env: params.environmentId,
      org: params.organizationId,
      jti,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: TELEGRAM_MOBILE_LINK_TTL_SECONDS,
      audience: JWT_AUDIENCE_INTEGRATION_STORE,
      issuer: JWT_ISSUER,
    });

    const expiresAt = new Date(Date.now() + TELEGRAM_MOBILE_LINK_TTL_SECONDS * 1000).toISOString();

    return { token, expiresAt };
  }

  verifyIntegrationStore(token: string): IntegrationStoreTelegramMobileLinkPayload {
    if (!token || typeof token !== 'string') {
      throw new InvalidTelegramMobileTokenError('invalid');
    }

    try {
      const payload = this.jwtService.verify<IntegrationStoreTelegramMobileLinkPayload>(token, {
        audience: JWT_AUDIENCE_INTEGRATION_STORE,
        issuer: JWT_ISSUER,
      });

      if (!payload?.env || !payload?.org || !payload?.jti) {
        throw new InvalidTelegramMobileTokenError('invalid');
      }

      return payload;
    } catch (err) {
      if (err instanceof InvalidTelegramMobileTokenError) throw err;
      const isExpired =
        typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        (err as { name?: string }).name === 'TokenExpiredError';
      throw new InvalidTelegramMobileTokenError(isExpired ? 'expired' : 'invalid');
    }
  }

  /**
   * Atomically claim a `jti` as used.
   * Returns `true` if this caller is the first to claim, `false` if already used.
   * Falls back to allow-by-default if the cache layer is unavailable so that the
   * primary auth check (the signed JWT) still gates access.
   */
  async claimJti(jti: string): Promise<boolean> {
    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn('Cache unavailable for telegram mobile jti tracking');

      return true;
    }

    const result = await this.cacheService.setIfNotExist(this.jtiKey(jti), '1', {
      ttl: USED_JTI_TTL_SECONDS,
    });

    return result !== null;
  }

  /** Check (without claiming) whether a jti has already been used. */
  async isJtiUsed(jti: string): Promise<boolean> {
    if (!this.cacheService.cacheEnabled()) return false;

    const value = await this.cacheService.get(this.jtiKey(jti));

    return value != null;
  }

  /** Release a previously-claimed jti — used to roll back when post-claim work fails. */
  async releaseJti(jti: string): Promise<void> {
    if (!this.cacheService.cacheEnabled()) return;

    try {
      await this.cacheService.del(this.jtiKey(jti));
    } catch (err) {
      this.logger.warn(`Failed to release telegram mobile jti ${jti}: ${(err as Error).message}`);
    }
  }

  private jtiKey(jti: string): string {
    return `${USED_JTI_KEY_PREFIX}${jti}`;
  }
}
