import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

/** Lifetime of an issued mobile setup token (seconds). */
export const TELEGRAM_MOBILE_LINK_TTL_SECONDS = 5 * 60;

const CACHE_KEY_PREFIX = 'telegram_mobile_link:';
const USED_KEY_PREFIX = 'telegram_mobile_link_used:';

/** 192 bits of entropy → 32 URL-safe base64url characters (compact QR payloads). */
const TOKEN_BYTES = 24;

const TOKEN_FORMAT = /^[A-Za-z0-9_-]{32}$/;

export type TelegramMobileLinkKind = 'agent' | 'integration-store';

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

type StoredPayload = TelegramMobileLinkTokenPayload | IntegrationStoreTelegramMobileLinkPayload;

interface StoredEntry {
  payload: StoredPayload;
  /** Epoch seconds when this entry naturally expires. */
  expiresAt: number;
}

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
  constructor(
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

    return this.mint(payload);
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

    return this.mint(payload);
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

  /** Returns whether a token was already consumed (used marker present). */
  async isTokenUsed(token: string): Promise<boolean> {
    if (!this.isTokenFormatValid(token) || !this.cacheService.cacheEnabled()) {
      return false;
    }

    const value = await this.cacheService.get(this.usedKey(token));

    return value != null;
  }

  /**
   * Atomically claims a token for single-use consumption (GETDEL).
   * Returns the stored entry, or throws {@link InvalidTelegramMobileTokenError}.
   */
  async claim(token: string, expectedKind: TelegramMobileLinkKind): Promise<ClaimedTelegramMobileLink> {
    this.assertCacheAvailable('claim');

    if (!this.isTokenFormatValid(token)) {
      throw new InvalidTelegramMobileTokenError('invalid');
    }

    if (await this.isTokenUsed(token)) {
      throw new InvalidTelegramMobileTokenError('used');
    }

    const client = this.cacheService.client;
    if (!client) {
      throw new TelegramMobileLinkCacheUnavailableError('claim');
    }

    let raw: string | null;
    try {
      raw = await client.getdel(this.storageKey(token));
    } catch (err) {
      throw new TelegramMobileLinkCacheUnavailableError('claim', err);
    }

    if (!raw) {
      if (await this.isTokenUsed(token)) {
        throw new InvalidTelegramMobileTokenError('used');
      }

      throw new InvalidTelegramMobileTokenError('expired');
    }

    const entry = this.parseEntry(raw);
    if (!entry || entry.payload.kind !== expectedKind) {
      throw new InvalidTelegramMobileTokenError('invalid');
    }

    const remaining = entry.expiresAt - Math.floor(Date.now() / 1000);
    const usedTtl = Math.max(1, remaining);

    try {
      await this.cacheService.set(this.usedKey(token), '1', { ttl: usedTtl });
    } catch (err) {
      throw new TelegramMobileLinkCacheUnavailableError('claim', err);
    }

    return entry;
  }

  /**
   * Re-stores a token after a failed consume so the visitor can retry the same link.
   */
  async release(token: string, claimed: ClaimedTelegramMobileLink): Promise<void> {
    if (!this.isTokenFormatValid(token) || !this.cacheService.cacheEnabled()) {
      return;
    }

    const remaining = claimed.expiresAt - Math.floor(Date.now() / 1000);
    if (remaining <= 0) {
      return;
    }

    const entry: StoredEntry = {
      payload: claimed.payload,
      expiresAt: claimed.expiresAt,
    };

    try {
      await this.cacheService.set(this.storageKey(token), JSON.stringify(entry), { ttl: remaining });
      await this.cacheService.del(this.usedKey(token));
    } catch (err) {
      this.logger.warn(`Failed to release telegram mobile link token: ${(err as Error).message}`);
    }
  }

  private async mint(payload: StoredPayload): Promise<IssuedTelegramMobileLink> {
    this.assertCacheAvailable('issue');

    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const mintedAt = Math.floor(Date.now() / 1000);
    const expiresAtEpoch = mintedAt + TELEGRAM_MOBILE_LINK_TTL_SECONDS;
    const entry: StoredEntry = { payload, expiresAt: expiresAtEpoch };

    await this.cacheService.set(this.storageKey(token), JSON.stringify(entry), {
      ttl: TELEGRAM_MOBILE_LINK_TTL_SECONDS,
    });

    const expiresAt = new Date(expiresAtEpoch * 1000).toISOString();

    return { token, expiresAt };
  }

  private async peek(token: string, expectedKind: TelegramMobileLinkKind): Promise<StoredPayload> {
    if (!this.isTokenFormatValid(token)) {
      throw new InvalidTelegramMobileTokenError('invalid');
    }

    if (!this.cacheService.cacheEnabled()) {
      throw new TelegramMobileLinkCacheUnavailableError('peek');
    }

    if (await this.isTokenUsed(token)) {
      throw new InvalidTelegramMobileTokenError('used');
    }

    let raw: string | null | undefined;
    try {
      raw = await this.cacheService.get(this.storageKey(token));
    } catch (err) {
      throw new TelegramMobileLinkCacheUnavailableError('peek', err);
    }

    if (!raw) {
      throw new InvalidTelegramMobileTokenError('expired');
    }

    const entry = this.parseEntry(raw);
    if (!entry || entry.payload.kind !== expectedKind) {
      throw new InvalidTelegramMobileTokenError('invalid');
    }

    if (entry.payload.kind === 'agent') {
      const agentPayload = entry.payload;
      if (!agentPayload.env || !agentPayload.org || !agentPayload.aid || !agentPayload.iid) {
        throw new InvalidTelegramMobileTokenError('invalid');
      }
    } else if (!entry.payload.env || !entry.payload.org) {
      throw new InvalidTelegramMobileTokenError('invalid');
    }

    return entry.payload;
  }

  private parseEntry(raw: string): ClaimedTelegramMobileLink | null {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredEntry>;
      if (!parsed?.payload || typeof parsed.expiresAt !== 'number') {
        return null;
      }

      const payload = parsed.payload;
      if (payload.kind !== 'agent' && payload.kind !== 'integration-store') {
        return null;
      }

      return { payload, expiresAt: parsed.expiresAt };
    } catch {
      return null;
    }
  }

  private isTokenFormatValid(token: string): boolean {
    return typeof token === 'string' && TOKEN_FORMAT.test(token);
  }

  private assertCacheAvailable(operation: string): void {
    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn(`Cache unavailable for telegram mobile link ${operation}`);

      throw new TelegramMobileLinkCacheUnavailableError(operation);
    }
  }

  private storageKey(token: string): string {
    return `${CACHE_KEY_PREFIX}${token}`;
  }

  private usedKey(token: string): string {
    return `${USED_KEY_PREFIX}${token}`;
  }
}
