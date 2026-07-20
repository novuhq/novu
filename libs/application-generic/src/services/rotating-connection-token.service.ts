import { BadGatewayException, Injectable } from '@nestjs/common';
import { ChannelConnectionEntity, ChannelConnectionRepository, IntegrationRepository } from '@novu/dal';
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

const ROTATING_TOKEN_PROVIDERS: Partial<Record<ProvidersIdEnum, RotatingTokenProvider>> = {
  [ChatProviderIdEnum.Slack]: {
    label: 'Slack',
    tokenUrl: SLACK_OAUTH_ACCESS_URL,
    parseResponse: parseSlackResponse,
  },
  [ChatProviderIdEnum.WebexMessaging]: {
    label: 'Webex',
    tokenUrl: WEBEX_ACCESS_TOKEN_URL,
    parseResponse: parseWebexResponse,
  },
};

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

/**
 * Single read path for rotating OAuth bot tokens stored on a `ChannelConnection`
 * (Slack, Webex).
 *
 * Legacy apps (token rotation disabled) store only `auth.accessToken`, which never
 * expires — those pass through unchanged. Rotation-enabled apps also store
 * `auth.refreshToken` and `auth.expiresAt` (persisted by the OAuth callback); their
 * access token is refreshed here before it expires and the newly issued pair is persisted.
 *
 * Refresh tokens are single-use, so concurrent refreshes across workers would invalidate
 * each other. A Redis `SET NX` lock per connection serializes the refresh; callers that
 * lose the race keep the currently stored token (still valid thanks to the refresh window)
 * and let the lock holder rotate for the next caller.
 *
 * A refresh failure throws `BadGatewayException`; callers that resolve many endpoints in
 * parallel should expect one bad connection to fail the whole batch.
 */
@Injectable()
export class RotatingConnectionTokenService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  async getConnectionToken(connection: ChannelConnectionEntity): Promise<string | undefined> {
    const decryptedAuth = decryptChannelConnectionAuth(connection.auth) as ChannelConnectionAuth | undefined;

    if (!decryptedAuth?.accessToken) {
      return undefined;
    }

    const provider = ROTATING_TOKEN_PROVIDERS[connection.providerId];

    if (!provider || !this.isRotatingAuth(decryptedAuth) || !this.isExpiringSoon(decryptedAuth.expiresAt)) {
      return decryptedAuth.accessToken;
    }

    return await this.refreshWithLock(connection, decryptedAuth, provider);
  }

  private isRotatingAuth(auth: ChannelConnectionAuth): auth is RotatingConnectionAuth {
    return Boolean(auth.accessToken && auth.refreshToken);
  }

  private async refreshWithLock(
    connection: ChannelConnectionEntity,
    decryptedAuth: RotatingConnectionAuth,
    provider: RotatingTokenProvider
  ): Promise<string> {
    if (!this.cacheService.cacheEnabled()) {
      return await this.refreshConnectionToken(connection, decryptedAuth, provider);
    }

    const lockKey = `${REFRESH_LOCK_KEY_PREFIX}{${connection._organizationId}:${connection._environmentId}:${connection.identifier}}`;

    /*
     * The refresh fires TOKEN_REFRESH_WINDOW_MS before expiry, so a caller that loses the
     * lock race is still holding a valid access token. Return it immediately and let the
     * lock holder rotate for the next caller.
     */
    const acquired = await this.cacheService.setIfNotExist(lockKey, '1', { ttl: REFRESH_LOCK_TTL_SECONDS });

    if (acquired !== 'OK') {
      return decryptedAuth.accessToken;
    }

    try {
      // Another process may have refreshed just before we acquired the lock — re-read first.
      const currentAuth = await this.readPersistedAuth(connection);

      if (currentAuth?.accessToken && !this.isExpiringSoon(currentAuth.expiresAt)) {
        return currentAuth.accessToken;
      }

      const authForRefresh = currentAuth && this.isRotatingAuth(currentAuth) ? currentAuth : decryptedAuth;

      return await this.refreshConnectionToken(connection, authForRefresh, provider);
    } finally {
      await this.cacheService.del(lockKey);
    }
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

    if (!integration?.credentials) {
      throw new Error(
        `Integration ${connection.integrationIdentifier} missing credentials for ${provider.label} token refresh`
      );
    }

    const { clientId, secretKey } = decryptCredentials(integration.credentials);

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
