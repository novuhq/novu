import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, encryptMcpConnectionAuth, PinoLogger, splitOAuthState } from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  EnvironmentRepository,
  McpConnectionEntity,
  McpConnectionRepository,
} from '@novu/dal';
import { CLAUDE_MCP_SERVERS, McpConnectionAuthModeEnum, McpConnectionStatusEnum } from '@novu/shared';
import axios, { type AxiosError } from 'axios';

import { getMcpOAuthCatalogEntry, type NovuOAuthCatalogEntry } from '../../utils/mcp-oauth-catalog';
import { MCP_OAUTH_STATE_TTL_MS } from '../generate-mcp-oauth-url/mcp-oauth.constants';
import { buildMcpOAuthRedirectUri, type McpOAuthState } from '../generate-mcp-oauth-url/mcp-oauth-state';
import { McpOAuthCallbackCommand, type McpOAuthCallbackResult } from './mcp-oauth-callback.command';

const MAX_ERROR_MESSAGE_LEN = 256;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

/**
 * Handle the OAuth redirect for an `agent_mcp_subscriber`-scoped MCP
 * connection (Novu-managed mode). Exchanges the provider's authorization
 * code for access/refresh tokens, encrypts them via
 * `encryptMcpConnectionAuth`, and persists them on the existing
 * `pending_oauth` row created by `GenerateMcpOAuthUrl`.
 *
 * Replay protection: the `oauthState` subdocument on `mcp_connection` is
 * treated as a one-shot nonce. Status transitions only fire when the row
 * is currently `pending_oauth`; all other rows are left untouched. This
 * prevents a replay of the same signed state from flipping a `connected`
 * row back to `error`.
 *
 * Provider-vault mode is intentionally a separate code path; that variant
 * runs through the provider's own callback and lands a row with
 * `authMode: 'provider'` + `providerRef.vaultId` instead.
 */
@Injectable()
export class McpOAuthCallback {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(McpOAuthCallback.name);
  }

  async execute(command: McpOAuthCallbackCommand): Promise<McpOAuthCallbackResult> {
    const stateData = await this.decodeAndValidateState(command.state);

    if (command.error) {
      const safeMessage = sanitizeErrorMessage(command.error);
      await this.markConnectionError(stateData, safeMessage);

      return { status: 'error', message: safeMessage };
    }

    if (!command.providerCode) {
      throw new BadRequestException('Missing required OAuth parameter: code');
    }

    const catalog = CLAUDE_MCP_SERVERS.find((entry) => entry.id === stateData.mcpId);
    const oauthConfig = getMcpOAuthCatalogEntry(stateData.mcpId);

    if (!catalog || oauthConfig.mode !== 'novu') {
      throw new BadRequestException(`MCP "${stateData.mcpId}" does not support Novu-managed OAuth.`);
    }

    const enablement = await this.agentMcpServerRepository.findOne(
      {
        _id: stateData.agentMcpServerId,
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
      },
      ['_id', '_agentId', 'enabled']
    );

    if (!enablement || !enablement.enabled) {
      throw new NotFoundException('Agent MCP enablement not found or has been disabled.');
    }

    if (enablement._agentId !== stateData.agentId) {
      throw new BadRequestException('OAuth state agent does not match enablement record.');
    }

    // Claim the pending row before talking to the OAuth provider. If the
    // row is missing or already moved past pending_oauth, this is a replay
    // attempt; bail out without exchanging the code.
    const claimed = await this.mcpConnectionRepository.findOneAndUpdate(
      {
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
        _agentMcpServerId: stateData.agentMcpServerId,
        _subscriberId: stateData.subscriberId,
        scope: stateData.scope,
        status: McpConnectionStatusEnum.PendingOAuth,
      },
      {
        $set: { status: McpConnectionStatusEnum.PendingOAuth },
        $unset: { lastError: 1 },
      },
      { new: true }
    );

    if (!claimed) {
      throw new BadRequestException(
        'OAuth callback rejected: connection is not awaiting authorisation. Restart the flow.'
      );
    }

    const tokenResponse = await this.exchangeCode(oauthConfig, command.providerCode, claimed.oauthState?.pkceVerifier);

    const expiresAt = tokenResponse.expires_in ? new Date(Date.now() + tokenResponse.expires_in * 1000) : undefined;

    const auth = encryptMcpConnectionAuth({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt,
      tokenType: tokenResponse.token_type,
      scopes: tokenResponse.scope ? tokenResponse.scope.split(/\s+/).filter(Boolean) : undefined,
    });

    await this.mcpConnectionRepository.update(
      {
        _id: claimed._id,
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
      },
      {
        $set: {
          authMode: McpConnectionAuthModeEnum.Novu,
          status: McpConnectionStatusEnum.Connected,
          auth,
          connectedAt: new Date(),
        },
        $unset: { oauthState: 1, lastError: 1, providerRef: 1 },
      }
    );

    return { status: 'connected' };
  }

  private async markConnectionError(stateData: McpOAuthState, error: string): Promise<void> {
    // Only mark error if the row is still pending_oauth; never flip a
    // connected row to error from a callback (replay protection).
    await this.mcpConnectionRepository.update(
      {
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
        _agentMcpServerId: stateData.agentMcpServerId,
        _subscriberId: stateData.subscriberId,
        scope: stateData.scope,
        status: McpConnectionStatusEnum.PendingOAuth,
      },
      {
        $set: {
          status: McpConnectionStatusEnum.Error,
          lastError: { code: 'oauth_callback_error', message: error, at: new Date() },
        },
        $unset: { oauthState: 1 },
      }
    );
  }

  private async exchangeCode(
    config: NovuOAuthCatalogEntry,
    code: string,
    pkceVerifier: string | undefined
  ): Promise<TokenResponse> {
    const clientId = process.env[config.clientIdEnvVar];
    const clientSecret = process.env[config.clientSecretEnvVar];

    if (!clientId || !clientSecret) {
      // Misconfigured server, not the user's fault — internal error.
      throw new Error(
        `MCP OAuth client credentials are not configured (${config.clientIdEnvVar}/${config.clientSecretEnvVar}).`
      );
    }

    if (config.pkceRequired && !pkceVerifier) {
      throw new BadRequestException('PKCE verifier missing on connection state; restart the flow.');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: buildMcpOAuthRedirectUri(),
    });

    if (pkceVerifier) {
      params.set('code_verifier', pkceVerifier);
    }

    try {
      const response = await axios.post<TokenResponse>(config.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        // Disable proxy / response transforms that could log raw bodies.
        validateStatus: (status) => status >= 200 && status < 300,
      });

      return response.data;
    } catch (err) {
      // Critical: NEVER let the AxiosError propagate. It carries the
      // request body (with `client_secret`) in `err.config.data`, and
      // global error filters / Sentry will serialize it. We log a tiny
      // sanitized record server-side and throw a clean BadRequestException.
      const status = isAxiosError(err) ? err.response?.status : undefined;
      const providerError = isAxiosError(err) ? extractProviderErrorCode(err) : undefined;

      this.logger.warn(
        {
          tokenUrl: config.tokenUrl,
          status,
          providerError,
        },
        'MCP OAuth token exchange failed'
      );

      throw new BadRequestException(
        providerError ? `OAuth token exchange failed: ${providerError}` : 'OAuth token exchange failed.'
      );
    }
  }

  private async decodeAndValidateState(state: string): Promise<McpOAuthState> {
    let parts: { payload: string; signature: string };
    try {
      parts = splitOAuthState(state);
    } catch {
      throw new BadRequestException('Invalid OAuth state parameter.');
    }

    let payload: McpOAuthState;
    try {
      payload = JSON.parse(parts.payload) as McpOAuthState;
    } catch {
      throw new BadRequestException('Invalid OAuth state parameter.');
    }

    if (!payload.environmentId || !payload.organizationId || !payload.agentId) {
      throw new BadRequestException('OAuth state missing required fields.');
    }

    const environment = await this.environmentRepository.findOne(
      {
        _id: payload.environmentId,
        _organizationId: payload.organizationId,
      },
      ['apiKeys']
    );

    if (!environment?.apiKeys?.length) {
      throw new NotFoundException('Environment for OAuth state not found or has no API keys.');
    }

    const apiKey = environment.apiKeys[0].key;
    const expected = createHash(apiKey, parts.payload);

    if (parts.signature !== expected) {
      throw new BadRequestException('OAuth state signature mismatch.');
    }

    if (Date.now() - payload.timestamp > MCP_OAUTH_STATE_TTL_MS) {
      throw new BadRequestException('OAuth state expired. Restart the authorisation flow.');
    }

    return payload;
  }
}

function sanitizeErrorMessage(message: string): string {
  // Strip control characters and clamp length so attacker-supplied error
  // text can't bloat the database or break log output.
  return message.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, MAX_ERROR_MESSAGE_LEN);
}

function isAxiosError(err: unknown): err is AxiosError {
  return Boolean(err) && typeof err === 'object' && (err as AxiosError).isAxiosError === true;
}

function extractProviderErrorCode(err: AxiosError): string | undefined {
  const data = err.response?.data as { error?: string; error_description?: string; message?: string } | undefined;
  if (!data) return undefined;

  // OAuth 2 standard: `error` is a short token (e.g. "invalid_grant").
  // Accept `message` as a generic fallback. Never log/return the full
  // body — it may contain access tokens.
  if (typeof data.error === 'string' && data.error.length <= 64) {
    return data.error;
  }
  if (typeof data.message === 'string' && data.message.length <= 64) {
    return data.message;
  }

  return undefined;
}
