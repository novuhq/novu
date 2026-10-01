import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { isConnectClaimTokenFormat } from '@novu/shared';

import { SingleUseTokenCache } from '../../shared/services/single-use-link-token.service';

export const CONNECT_CLAIM_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const ENV_TOKEN_KEY_PREFIX = 'connect_claim_link_env:';
const CTA_POSTED_KEY_PREFIX = 'connect_claim_cta_posted:';
const CLAIM_LOCK_KEY_PREFIX = 'connect_claim_link_lock:';

const CLAIM_LOCK_TTL_SECONDS = 60;

export interface ConnectClaimTokenPayload {
  env: string;
  org: string;
}

export interface IssuedConnectClaimToken {
  token: string;
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
  private readonly tokens: SingleUseTokenCache<ConnectClaimTokenPayload>;

  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
    this.tokens = new SingleUseTokenCache<ConnectClaimTokenPayload>({
      cacheService,
      logger,
      scope: 'connect claim token',
      keyPrefix: 'connect_claim_link:',
      usedKeyPrefix: 'connect_claim_link_used:',
      ttlSeconds: CONNECT_CLAIM_TOKEN_TTL_SECONDS,
      isValidTokenFormat: (token) => typeof token === 'string' && isConnectClaimTokenFormat(token),
      createCacheUnavailableError: (operation, cause) => new ConnectClaimTokenCacheUnavailableError(operation, cause),
    });
  }

  async issue(payload: ConnectClaimTokenPayload): Promise<IssuedConnectClaimToken> {
    return this.tokens.issue(payload);
  }

  async issueOrGetForEnvironment(payload: ConnectClaimTokenPayload): Promise<IssuedConnectClaimToken> {
    this.assertCacheAvailable('issueOrGetForEnvironment');

    const envKey = `${ENV_TOKEN_KEY_PREFIX}{${payload.env}}`;
    const existingToken = await this.cacheService.get(envKey);

    if (existingToken && isConnectClaimTokenFormat(existingToken)) {
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
   * True once the claim token issued for this keyless environment has been
   * consumed — i.e. its assets now live in a real organization. Best-effort:
   * cache outages and missing tokens read as "not claimed".
   */
  async isEnvironmentClaimed(environmentId: string): Promise<boolean> {
    if (!this.cacheService.cacheEnabled()) {
      return false;
    }

    try {
      const token = await this.cacheService.get(`${ENV_TOKEN_KEY_PREFIX}{${environmentId}}`);
      if (!token || !isConnectClaimTokenFormat(token)) {
        return false;
      }

      return await this.tokens.isTokenUsed(token);
    } catch (error) {
      this.logger.warn({ err: error, environmentId }, 'Failed to read connect claim state for environment');

      return false;
    }
  }

  async isSignupCtaPosted(conversationId: string): Promise<boolean> {
    if (!this.cacheService.cacheEnabled()) {
      return false;
    }

    const key = `${CTA_POSTED_KEY_PREFIX}{${conversationId}}`;
    const posted = await this.cacheService.get(key);

    return posted != null;
  }

  async tryMarkSignupCtaPosted(conversationId: string): Promise<boolean> {
    this.assertCacheAvailable('tryMarkSignupCtaPosted');

    const key = `${CTA_POSTED_KEY_PREFIX}{${conversationId}}`;
    const acquired = await this.cacheService.setIfNotExist(key, '1', { ttl: CONNECT_CLAIM_TOKEN_TTL_SECONDS });

    return acquired === 'OK';
  }

  async tryAcquireClaimLock(token: string): Promise<boolean> {
    this.assertCacheAvailable('tryAcquireClaimLock');

    if (!isConnectClaimTokenFormat(token)) {
      return false;
    }

    const key = `${CLAIM_LOCK_KEY_PREFIX}{${token}}`;
    const acquired = await this.cacheService.setIfNotExist(key, '1', { ttl: CLAIM_LOCK_TTL_SECONDS });

    return acquired === 'OK';
  }

  async releaseClaimLock(token: string): Promise<void> {
    if (!this.cacheService.cacheEnabled() || !isConnectClaimTokenFormat(token)) {
      return;
    }

    await this.cacheService.del(`${CLAIM_LOCK_KEY_PREFIX}{${token}}`);
  }

  async verify(token: string): Promise<ConnectClaimTokenPayload> {
    this.assertCacheAvailable('verify');

    const outcome = await this.tokens.peek(token);

    switch (outcome.status) {
      case 'active':
        return this.validatePayload(outcome.entry.payload);
      case 'used':
        throw new InvalidConnectClaimTokenError('used');
      case 'missing':
        throw new InvalidConnectClaimTokenError('expired');
      case 'corrupt':
      case 'malformed-token':
        throw new InvalidConnectClaimTokenError('invalid');
      default: {
        const exhaustive: never = outcome;
        throw new Error(`Unhandled peek outcome: ${exhaustive}`);
      }
    }
  }

  async claim(token: string): Promise<ConnectClaimTokenPayload> {
    const outcome = await this.tokens.claim(token);

    switch (outcome.status) {
      case 'claimed':
        return this.validatePayload(outcome.entry.payload);
      case 'used':
        throw new InvalidConnectClaimTokenError('used');
      case 'missing':
        throw new InvalidConnectClaimTokenError('expired');
      case 'corrupt':
      case 'kind-mismatch':
      case 'malformed-token':
        throw new InvalidConnectClaimTokenError('invalid');
      default: {
        const exhaustive: never = outcome;
        throw new Error(`Unhandled claim outcome: ${exhaustive}`);
      }
    }
  }

  private validatePayload(payload: ConnectClaimTokenPayload): ConnectClaimTokenPayload {
    if (!payload.env || !payload.org) {
      throw new InvalidConnectClaimTokenError('invalid');
    }

    return payload;
  }

  private async readIssuedToken(
    token: string,
    expectedPayload: ConnectClaimTokenPayload
  ): Promise<IssuedConnectClaimToken | null> {
    const outcome = await this.tokens.peek(token);
    if (outcome.status !== 'active') {
      return null;
    }

    const { payload, expiresAt } = outcome.entry;
    if (payload.env !== expectedPayload.env || payload.org !== expectedPayload.org) {
      return null;
    }

    return { token, expiresAt: new Date(expiresAt * 1000).toISOString() };
  }

  private assertCacheAvailable(operation: string): void {
    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn(`Cache unavailable for connect claim token ${operation}`);

      throw new ConnectClaimTokenCacheUnavailableError(operation);
    }
  }
}
