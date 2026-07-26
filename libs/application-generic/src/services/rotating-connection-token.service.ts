import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ChatProviderIdEnum, ProvidersIdEnum } from '@novu/shared';
import axios from 'axios';
import {
  type ChannelConnectionAuth,
  decryptChannelConnectionAuth,
  decryptCredentials,
  encryptChannelConnectionAuth,
} from '../encryption';
import { CacheService } from './cache';

export const SLACK_OAUTH_ACCESS_URL = 'https://slack.com/api/oauth.v2.access';
const WEBEX_ACCESS_TOKEN_URL = 'https://webexapis.com/v1/access_token';

/** Refresh this long before the stored expiry so in-flight sends never use an expired token. */
const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;

const REFRESH_LOCK_KEY_PREFIX = 'connection_token_refresh_lock:';
const REFRESH_LOCK_TTL_SECONDS = 30;
const REFRESH_REQUEST_TIMEOUT_MS = 10000;

/**
 * A forced refresh (the `/verify` endpoint) must observe a real token exchange, so instead of
 * falling back to the stored token when it loses the lock race, it briefly waits and retries the
 * lock while the current holder rotates.
 */
const FORCE_REFRESH_LOCK_MAX_ATTEMPTS = 5;
const FORCE_REFRESH_LOCK_RETRY_DELAY_MS = 200;

/** Normalized shape of a provider's `refresh_token` grant response. */
export interface RotatingTokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  refreshTokenExpiresIn?: number;
}

interface RotatingTokenProvider {
  label: string;
  tokenUrl: string;
  /** Maps the raw provider response to the normalized shape; throws on API-level errors. */
  parseResponse(data: unknown): RotatingTokenRefreshResult;
}

/** Auth known to be rotatable: both an access token and the refresh token are present. */
type RotatingConnectionAuth = ChannelConnectionAuth & { accessToken: string; refreshToken: string };

interface SlackRefreshRawResponse {
  ok: boolean;
  error?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

interface WebexRefreshRawResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
}

function parseSlackResponse(data: unknown): RotatingTokenRefreshResult {
  const slack = (data ?? {}) as SlackRefreshRawResponse;

  // Slack returns HTTP 200 with `ok: false` on API-level errors.
  if (!slack.ok) {
    throw new BadGatewayException(
      `Slack token refresh failed: ${slack.error ?? 'unknown_error'}. Reconnect the Slack channel connection.`
    );
  }

  return {
    accessToken: slack.access_token as string,
    refreshToken: slack.refresh_token,
    expiresIn: slack.expires_in,
  };
}

function parseWebexResponse(data: unknown): RotatingTokenRefreshResult {
  const webex = (data ?? {}) as WebexRefreshRawResponse;

  return {
    accessToken: webex.access_token as string,
    refreshToken: webex.refresh_token,
    expiresIn: webex.expires_in,
    refreshTokenExpiresIn: webex.refresh_token_expires_in,
  };
}

const SLACK_ROTATING_TOKEN_PROVIDER: RotatingTokenProvider = {
  label: 'Slack',
  tokenUrl: SLACK_OAUTH_ACCESS_URL,
  parseResponse: parseSlackResponse,
};

const ROTATING_TOKEN_PROVIDERS: Partial<Record<ProvidersIdEnum, RotatingTokenProvider>> = {
  [ChatProviderIdEnum.Slack]: SLACK_ROTATING_TOKEN_PROVIDER,
  /*
   * The Novu-managed demo Slack integration completes the same Slack OAuth flow
   * (SlackOauthCallback accepts both provider ids), so its connections can also
   * carry a rotating refresh token.
   */
  [ChatProviderIdEnum.Novu]: SLACK_ROTATING_TOKEN_PROVIDER,
  [ChatProviderIdEnum.WebexMessaging]: {
    label: 'Webex',
    tokenUrl: WEBEX_ACCESS_TOKEN_URL,
    parseResponse: parseWebexResponse,
  },
};

/**
 * Whether a provider supports rotating OAuth tokens (short-lived access token +
 * refresh token). Only these providers can make use of a stored `refreshToken`, so
 * manual `channelConnections` write paths reject rotation auth for anything else.
 */
export function isRotatingTokenProvider(providerId: ProvidersIdEnum): boolean {
  return Boolean(ROTATING_TOKEN_PROVIDERS[providerId]);
}

/**
 * Normalizes manually-supplied rotation auth. When a `refreshToken` is present without
 * an `expiresAt`, defaults it to now so the first send treats the token as expiring and
 * refreshes immediately — Novu then learns the real expiry from the provider's response.
 * Auth without a `refreshToken` (legacy long-lived tokens) is returned unchanged.
 */
export function normalizeRotatingAuth(auth: ChannelConnectionAuth & { accessToken: string }): ChannelConnectionAuth & {
  accessToken: string;
} {
  if (!auth.refreshToken || auth.expiresAt) {
    return auth;
  }

  return { ...auth, expiresAt: new Date().toISOString() };
}

/**
 * Builds the `ChannelConnection.auth` persisted after an OAuth grant. Apps with token
 * rotation return a short-lived `access_token` plus a `refresh_token` and expiry, all of
 * which are stored so the send paths can refresh before expiry. Apps without rotation
 * return only a long-lived `access_token` and are stored as-is.
 *
 * Shared by the OAuth callbacks and this service so the `expires_in -> expiresAt`
 * computation lives in one place.
 */
export function buildConnectionAuthFromOAuth(payload: {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
}): ChannelConnectionAuth & { accessToken: string } {
  if (!payload.refresh_token) {
    return { accessToken: payload.access_token };
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: buildExpiresAtIso(payload.expires_in),
    refreshTokenExpiresAt: buildExpiresAtIso(payload.refresh_token_expires_in),
  };
}

function buildExpiresAtIso(expiresInSeconds?: number): string | undefined {
  if (!expiresInSeconds) {
    return undefined;
  }

  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

/** Stable per-connection key shared by the in-process coalescing map and the Redis lock. */
function buildConnectionRefreshKey(connection: ChannelConnectionEntity): string {
  return `${connection._organizationId}:${connection._environmentId}:${connection.identifier}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Single read path for rotating OAuth bot tokens stored on a `ChannelConnection`
 * (Slack, Webex).
 *
 * Legacy apps (token rotation disabled) store only `auth.accessToken`, which never
 * expires — those pass through unchanged. Rotation-enabled apps also store
 * `auth.refreshToken` and `auth.expiresAt` (persisted by the OAuth callback); their
 * access token is refreshed here before it expires and the newly issued pair is persisted.
 *
 * Refresh tokens are single-use, so concurrent refreshes would invalidate each other.
 * Concurrency is serialized at two layers, keyed by the same `organization:environment:
 * identifier` triple:
 *  - In-process: a `Map` of in-flight refresh promises coalesces concurrent callers within
 *    this instance (e.g. a worker resolving several endpoints that share one connection)
 *    onto a single refresh, so they all share the fresh token instead of racing.
 *  - Cross-process: a Redis `SET NX` lock serializes the refresh across workers/replicas.
 *    Callers that lose the lock race keep the currently stored token (still valid thanks
 *    to the refresh window) and let the lock holder rotate for the next caller.
 *
 * A refresh failure throws `BadGatewayException`; callers that resolve many endpoints in
 * parallel should expect one bad connection to fail the whole batch.
 */
@Injectable()
export class RotatingConnectionTokenService {
  private readonly refreshPromises = new Map<string, Promise<string>>();

  constructor(
    private readonly cacheService: CacheService,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  /**
   * `forceRefresh` is set by the `/verify` endpoint: it must confirm an actual exchange of the stored
   * refresh token rather than reporting success off a still-valid access token, so it never takes the
   * lock-loser shortcut and never piggybacks on another caller's in-flight refresh.
   */
  async getConnectionToken(
    connection: ChannelConnectionEntity,
    options: { forceRefresh?: boolean } = {}
  ): Promise<string | undefined> {
    const decryptedAuth = decryptChannelConnectionAuth(connection.auth) as ChannelConnectionAuth | undefined;

    if (!decryptedAuth?.accessToken) {
      return undefined;
    }

    const provider = ROTATING_TOKEN_PROVIDERS[connection.providerId];
    const forceRefresh = options.forceRefresh === true;

    // A forced verify must exchange the refresh token even while the current access token is still
    // far from expiry — otherwise a freshly pasted (possibly invalid) refresh token would be accepted
    // and stored without ever being validated against the provider.
    const shouldRefresh = forceRefresh || this.isExpiringSoon(decryptedAuth.expiresAt);

    if (!provider || !this.isRotatingAuth(decryptedAuth) || !shouldRefresh) {
      return decryptedAuth.accessToken;
    }

    const runRefresh = () => this.refreshWithLock(connection, decryptedAuth, provider, forceRefresh);

    // A forced verify must observe its own exchange, so it bypasses the in-process coalescing that
    // could otherwise hand it a token from a pre-send refresh that lost the lock (no exchange happened).
    if (forceRefresh) {
      return await runRefresh();
    }

    return await this.coalesceRefresh(connection, runRefresh);
  }

  /**
   * Ensures at most one in-flight refresh per connection within this process. Concurrent
   * callers for the same connection share the winner's resolved token or rejection instead
   * of each independently racing for the Redis lock (and, when the cache is disabled,
   * instead of each firing its own refresh against the single-use refresh token).
   */
  private async coalesceRefresh(connection: ChannelConnectionEntity, work: () => Promise<string>): Promise<string> {
    const key = buildConnectionRefreshKey(connection);
    const existing = this.refreshPromises.get(key);

    if (existing) {
      return await existing;
    }

    const promise = work().finally(() => this.refreshPromises.delete(key));
    this.refreshPromises.set(key, promise);

    return await promise;
  }

  private isRotatingAuth(auth: ChannelConnectionAuth): auth is RotatingConnectionAuth {
    return Boolean(auth.accessToken && auth.refreshToken);
  }

  private async refreshWithLock(
    connection: ChannelConnectionEntity,
    decryptedAuth: RotatingConnectionAuth,
    provider: RotatingTokenProvider,
    forceRefresh: boolean
  ): Promise<string> {
    if (!this.cacheService.cacheEnabled()) {
      return await this.refreshConnectionToken(connection, decryptedAuth, provider);
    }

    const lockKey = `${REFRESH_LOCK_KEY_PREFIX}{${buildConnectionRefreshKey(connection)}}`;

    const acquired = await this.acquireRefreshLock(lockKey, forceRefresh);

    if (acquired !== 'OK') {
      /*
       * The refresh fires TOKEN_REFRESH_WINDOW_MS before expiry, so a pre-send caller that loses the
       * lock race is still holding a valid access token — return it and let the lock holder rotate for
       * the next caller. A forced verify cannot make that assumption: after waiting for the lock it
       * still failed to acquire it, so it accepts only a token the holder has already rotated (proving
       * the refresh token works) and otherwise fails fast.
       */
      if (!forceRefresh) {
        return decryptedAuth.accessToken;
      }

      const rotatedAuth = await this.readPersistedAuth(connection);

      if (rotatedAuth?.accessToken && !this.isExpiringSoon(rotatedAuth.expiresAt)) {
        return rotatedAuth.accessToken;
      }

      throw new BadGatewayException(
        `A token refresh for the ${provider.label} channel connection is already in progress. Retry the verification in a few seconds.`
      );
    }

    try {
      // Another process may have refreshed just before we acquired the lock — re-read first.
      // A forced verify skips this shortcut so it always performs its own exchange and validates
      // the stored refresh token rather than trusting a still-valid access token.
      const currentAuth = await this.readPersistedAuth(connection);

      if (!forceRefresh && currentAuth?.accessToken && !this.isExpiringSoon(currentAuth.expiresAt)) {
        return currentAuth.accessToken;
      }

      const authForRefresh = currentAuth && this.isRotatingAuth(currentAuth) ? currentAuth : decryptedAuth;

      return await this.refreshConnectionToken(connection, authForRefresh, provider);
    } finally {
      await this.cacheService.del(lockKey);
    }
  }

  /**
   * Acquire the per-connection Redis refresh lock. A pre-send refresh takes a single non-blocking
   * shot and falls back to the stored token when it loses. A forced verify instead retries the lock
   * for a short window so it can perform (or observe) a real exchange rather than skip it.
   */
  private async acquireRefreshLock(lockKey: string, forceRefresh: boolean): Promise<string | null> {
    const acquired = await this.cacheService.setIfNotExist(lockKey, '1', { ttl: REFRESH_LOCK_TTL_SECONDS });

    if (acquired === 'OK' || !forceRefresh) {
      return acquired;
    }

    for (let attempt = 1; attempt < FORCE_REFRESH_LOCK_MAX_ATTEMPTS; attempt += 1) {
      await delay(FORCE_REFRESH_LOCK_RETRY_DELAY_MS);

      const retried = await this.cacheService.setIfNotExist(lockKey, '1', { ttl: REFRESH_LOCK_TTL_SECONDS });

      if (retried === 'OK') {
        return retried;
      }
    }

    return null;
  }

  private async readPersistedAuth(connection: ChannelConnectionEntity): Promise<ChannelConnectionAuth | undefined> {
    const persisted = await this.channelConnectionRepository.findOne({
      _environmentId: connection._environmentId,
      _organizationId: connection._organizationId,
      identifier: connection.identifier,
    });

    if (!persisted?.auth) {
      return undefined;
    }

    return decryptChannelConnectionAuth(persisted.auth) as ChannelConnectionAuth;
  }

  private async refreshConnectionToken(
    connection: ChannelConnectionEntity,
    decryptedAuth: RotatingConnectionAuth,
    provider: RotatingTokenProvider
  ): Promise<string> {
    const integration = await this.integrationRepository.findOne({
      identifier: connection.integrationIdentifier,
      _environmentId: connection._environmentId,
      _organizationId: connection._organizationId,
    });

    if (!integration) {
      throw new Error(`Integration ${connection.integrationIdentifier} not found for ${provider.label} token refresh`);
    }

    const { clientId, secretKey } = this.resolveOAuthClientCredentials(integration, provider);

    if (!clientId || !secretKey) {
      throw new Error(
        `Integration ${connection.integrationIdentifier} missing required ${provider.label} OAuth credentials`
      );
    }

    const refreshed = await this.requestTokenRefresh(provider, decryptedAuth.refreshToken, clientId, secretKey);

    if (!refreshed.accessToken) {
      throw new Error(
        `${provider.label} token refresh did not return an access token for connection ${connection.identifier}`
      );
    }

    const refreshedAuth: ChannelConnectionAuth = {
      ...decryptedAuth,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? decryptedAuth.refreshToken,
      expiresAt: buildExpiresAtIso(refreshed.expiresIn) ?? decryptedAuth.expiresAt,
      refreshTokenExpiresAt: buildExpiresAtIso(refreshed.refreshTokenExpiresIn) ?? decryptedAuth.refreshTokenExpiresAt,
    };

    await this.channelConnectionRepository.findOneAndUpdate(
      {
        _environmentId: connection._environmentId,
        _organizationId: connection._organizationId,
        identifier: connection.identifier,
      },
      {
        $set: {
          auth: encryptChannelConnectionAuth(refreshedAuth),
        },
      }
    );

    return refreshed.accessToken;
  }

  /**
   * The Novu-managed demo Slack integration stores no credentials on the integration
   * document — its OAuth client lives in env vars (same source `GetNovuProviderCredentials`
   * uses for the OAuth callback that issued the refresh token).
   */
  private resolveOAuthClientCredentials(
    integration: IntegrationEntity,
    provider: RotatingTokenProvider
  ): { clientId?: string; secretKey?: string } {
    if (integration.providerId === ChatProviderIdEnum.Novu) {
      return {
        clientId: process.env.NOVU_SLACK_INTEGRATION_CLIENT_ID,
        secretKey: process.env.NOVU_SLACK_INTEGRATION_CLIENT_SECRET,
      };
    }

    if (!integration.credentials) {
      throw new Error(`Integration ${integration.identifier} missing credentials for ${provider.label} token refresh`);
    }

    const { clientId, secretKey } = decryptCredentials(integration.credentials);

    return { clientId, secretKey };
  }

  private async requestTokenRefresh(
    provider: RotatingTokenProvider,
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<RotatingTokenRefreshResult> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    let response: { data: unknown };
    try {
      response = await axios.post(provider.tokenUrl, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: REFRESH_REQUEST_TIMEOUT_MS,
      });
    } catch (error) {
      this.handleRefreshError(provider, error);
    }

    return provider.parseResponse(response.data);
  }

  private handleRefreshError(provider: RotatingTokenProvider, error: unknown): never {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    const status = error.response?.status;
    const message = this.getResponseErrorMessage(error.response?.data) || error.message;
    const statusText = status ? ` (HTTP ${status})` : '';

    throw new BadGatewayException(
      `${provider.label} token refresh failed${statusText}: ${message}. Reconnect the ${provider.label} channel connection.`
    );
  }

  private getResponseErrorMessage(data: unknown): string {
    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object' && data !== null && 'message' in data) {
      return String((data as { message: unknown }).message);
    }

    return data === undefined ? '' : JSON.stringify(data);
  }

  private isExpiringSoon(expiresAt?: string): boolean {
    if (!expiresAt) {
      return false;
    }

    const expiresAtTime = new Date(expiresAt).getTime();

    if (Number.isNaN(expiresAtTime)) {
      return false;
    }

    return expiresAtTime - Date.now() <= TOKEN_REFRESH_WINDOW_MS;
  }
}
