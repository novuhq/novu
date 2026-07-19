import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

import {
  SingleUseTokenCache,
  StoredTokenEntry,
} from '../shared/services/single-use-link-token.service';

/** Lifetime of an issued mobile setup token (seconds). */
export const TELEGRAM_MOBILE_LINK_TTL_SECONDS = 5 * 60;

/**
 * Accepts both the new alphanumeric-only mint format and legacy base64url
 * tokens still live within the short TTL window. New tokens are minted from an
 * alphanumeric-only alphabet so the setup URL's trailing token survives GFM
 * bare-URL autolinking.
 */
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{32}$/;

export type TelegramMobileLinkKind = 'agent' | 'integration-store' | 'slack-agent-setup';

export interface TelegramMobileLinkTokenPayload {
  kind: 'agent';
  /** Environment id. */
  env: string;
  /** Organization id. */
  org: string;
  /** Agent external identifier. */
  aid: string;
  /** Integration id (internal Mongo `_id`). */
  iid: string;
  /** Subscriber to link via `/start` deep link after mobile setup (optional). */
  sid?: string;
}

/**
 * Payload for the agent-less integration-store flow. The consumer creates a
 * brand-new Telegram integration on submit, so no integration or agent id is
 * known at issue time.
 */
export interface IntegrationStoreTelegramMobileLinkPayload {
  kind: 'integration-store';
  env: string;
  org: string;
}

export interface SlackAgentSetupLinkPayload {
  kind: 'slack-agent-setup';
  env: string;
  org: string;
  /** Agent external identifier. */
  aid: string;
  /** Integration id (internal Mongo `_id`). */
  iid: string;
}

type StoredPayload =
  | TelegramMobileLinkTokenPayload
  | IntegrationStoreTelegramMobileLinkPayload
  | SlackAgentSetupLinkPayload;

export interface IssuedTelegramMobileLink {
  token: string;
  /** ISO timestamp when this token expires. */
  expiresAt: string;
}

export interface ClaimedTelegramMobileLink {
  payload: StoredPayload;
  expiresAt: number;
}

export class InvalidTelegramMobileTokenError extends Error {
  constructor(public readonly reason: 'invalid' | 'expired' | 'used') {
    super(`Telegram mobile token is ${reason}`);
  }
}

export class TelegramMobileLinkCacheUnavailableError extends Error {
  constructor(operation: string, cause?: unknown) {
    super(`Telegram mobile link cache unavailable during ${operation}`);
    this.name = 'TelegramMobileLinkCacheUnavailableError';
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

@Injectable()
export class TelegramMobileLinkTokenService {
  private readonly tokens: SingleUseTokenCache<StoredPayload>;

  constructor(cacheService: CacheService, logger: PinoLogger) {
    logger.setContext(this.constructor.name);
    this.tokens = new SingleUseTokenCache<StoredPayload>({
      cacheService,
      logger,
      scope: 'telegram mobile link',
      keyPrefix: 'telegram_mobile_link:',
      usedKeyPrefix: 'telegram_mobile_link_used:',
      ttlSeconds: TELEGRAM_MOBILE_LINK_TTL_SECONDS,
      isValidTokenFormat: (token) => typeof token === 'string' && TOKEN_FORMAT.test(token),
      createCacheUnavailableError: (operation, cause) =>
        new TelegramMobileLinkCacheUnavailableError(operation, cause),
    });
  }

  async issue(params: {
    environmentId: string;
    organizationId: string;
    agentIdentifier: string;
    integrationId: string;
    subscriberId?: string;
  }): Promise<IssuedTelegramMobileLink> {
    const payload: TelegramMobileLinkTokenPayload = {
      kind: 'agent',
      env: params.environmentId,
      org: params.organizationId,
      aid: params.agentIdentifier,
      iid: params.integrationId,
      ...(params.subscriberId ? { sid: params.subscriberId } : {}),
    };

    return this.tokens.issue(payload);
  }

  async issueForIntegrationStore(params: {
    environmentId: string;
    organizationId: string;
  }): Promise<IssuedTelegramMobileLink> {
    const payload: IntegrationStoreTelegramMobileLinkPayload = {
      kind: 'integration-store',
      env: params.environmentId,
      org: params.organizationId,
    };

    return this.tokens.issue(payload);
  }

  async issueForSlackAgentSetup(params: {
    environmentId: string;
    organizationId: string;
    agentIdentifier: string;
    integrationId: string;
  }): Promise<IssuedTelegramMobileLink> {
    const payload: SlackAgentSetupLinkPayload = {
      kind: 'slack-agent-setup',
      env: params.environmentId,
      org: params.organizationId,
      aid: params.agentIdentifier,
      iid: params.integrationId,
    };

    return this.tokens.issue(payload);
  }

  /**
   * Reads the stored payload without consuming the token (safe for status/prefetch).
   */
  async verify(token: string): Promise<TelegramMobileLinkTokenPayload> {
    return this.peek(token, 'agent') as Promise<TelegramMobileLinkTokenPayload>;
  }

  async verifyIntegrationStore(token: string): Promise<IntegrationStoreTelegramMobileLinkPayload> {
    return this.peek(token, 'integration-store') as Promise<IntegrationStoreTelegramMobileLinkPayload>;
  }

  async verifySlackAgentSetup(token: string): Promise<SlackAgentSetupLinkPayload> {
    return this.peek(token, 'slack-agent-setup') as Promise<SlackAgentSetupLinkPayload>;
  }

  /** Returns whether a token was already consumed (used marker present). */
  async isTokenUsed(token: string): Promise<boolean> {
    return this.tokens.isTokenUsed(token);
  }

  /**
   * Atomically claims a token for single-use consumption (GETDEL + used marker).
   * Returns the stored entry, or throws {@link InvalidTelegramMobileTokenError}.
   */
  async claim(token: string, expectedKind: TelegramMobileLinkKind): Promise<ClaimedTelegramMobileLink> {
    const outcome = await this.tokens.claim(token, expectedKind);

    switch (outcome.status) {
      case 'claimed': {
        const entry = this.validateEntry(outcome.entry, expectedKind);
        if (!entry) {
          throw new InvalidTelegramMobileTokenError('invalid');
        }

        return entry;
      }
      case 'used':
        throw new InvalidTelegramMobileTokenError('used');
      case 'missing':
        throw new InvalidTelegramMobileTokenError('expired');
      case 'corrupt':
      case 'kind-mismatch':
      case 'malformed-token':
        throw new InvalidTelegramMobileTokenError('invalid');
      default: {
        const exhaustive: never = outcome;
        throw new Error(`Unhandled claim outcome: ${exhaustive}`);
      }
    }
  }

  /**
   * Re-stores a token after a failed consume so the visitor can retry the same link.
   */
  async release(token: string, claimed: ClaimedTelegramMobileLink): Promise<void> {
    await this.tokens.release(token, claimed);
  }

  private async peek(token: string, expectedKind: TelegramMobileLinkKind): Promise<StoredPayload> {
    const outcome = await this.tokens.peek(token);

    switch (outcome.status) {
      case 'active': {
        const entry = this.validateEntry(outcome.entry, expectedKind);
        if (!entry) {
          throw new InvalidTelegramMobileTokenError('invalid');
        }

        return entry.payload;
      }
      case 'used':
        throw new InvalidTelegramMobileTokenError('used');
      case 'missing':
        throw new InvalidTelegramMobileTokenError('expired');
      case 'corrupt':
      case 'malformed-token':
        throw new InvalidTelegramMobileTokenError('invalid');
      default: {
        const exhaustive: never = outcome;
        throw new Error(`Unhandled peek outcome: ${exhaustive}`);
      }
    }
  }

  private validateEntry(
    entry: StoredTokenEntry<StoredPayload>,
    expectedKind: TelegramMobileLinkKind
  ): ClaimedTelegramMobileLink | null {
    const { payload } = entry;
    if (payload.kind !== expectedKind) {
      return null;
    }

    if (payload.kind === 'agent' || payload.kind === 'slack-agent-setup') {
      if (!payload.env || !payload.org || !payload.aid || !payload.iid) {
        return null;
      }
    } else if (!payload.env || !payload.org) {
      return null;
    }

    return { payload, expiresAt: entry.expiresAt };
  }
}
