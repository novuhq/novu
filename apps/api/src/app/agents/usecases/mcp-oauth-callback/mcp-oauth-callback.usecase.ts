import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  createHash,
  decryptMcpConnectionOAuthClient,
  encryptMcpConnectionAuth,
  PinoLogger,
  splitOAuthState,
} from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  EnvironmentRepository,
  McpConnectionEntity,
  McpConnectionOAuthClient,
  McpConnectionRepository,
} from '@novu/dal';
import { MCP_SERVERS, McpConnectionAuthModeEnum, McpConnectionStatusEnum } from '@novu/shared';
import axios, { type AxiosError } from 'axios';

import { McpOAuthDiscoveryService } from '../../services/mcp-oauth-discovery.service';
import { getMcpOAuthCatalogEntry } from '../../utils/mcp-oauth-catalog';
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
 * connection (Novu-managed mode), following the MCP authorization spec
 * (`modelcontextprotocol.io/specification/draft/basic/authorization`).
 *
 * Trust chain on entry:
 *  - The signed `state` parameter is verified against the originating
 *    environment's API key (HMAC, same primitive as chat OAuth callbacks).
 *  - The Mongo `oauthState` is treated as a one-shot nonce: status transitions
 *    only fire when the row is currently `pending_oauth`. This prevents a
 *    replay of the signed state from flipping a `connected` row back to
 *    `error`.
 *  - The recorded `oauthState.expectedIssuer` is compared against the `iss`
 *    query parameter per RFC 9207 §2.4. Mismatches reject the response
 *    before the authorization code reaches any token endpoint.
 *  - The token request uses the `oauthClient.tokenEndpoint` recorded at
 *    authorize-URL time (discovered from AS metadata; never derived from the
 *    callback request). The `resource` parameter is replayed verbatim per
 *    RFC 8707.
 */
@Injectable()
export class McpOAuthCallback {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly discoveryService: McpOAuthDiscoveryService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(McpOAuthCallback.name);
  }

  async execute(command: McpOAuthCallbackCommand): Promise<McpOAuthCallbackResult> {
    const stateData = await this.decodeAndValidateState(command.state);

    if (command.error) {
      const safeMessage = sanitizeErrorMessage(command.error);
      await this.markConnectionError(stateData, 'oauth_callback_error', safeMessage);

      return { status: 'error', message: safeMessage };
    }

    if (!command.providerCode) {
      throw new BadRequestException('Missing required OAuth parameter: code');
    }

    const catalog = MCP_SERVERS.find((entry) => entry.id === stateData.mcpId);
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

    const oauthClient = this.requireOAuthClient(claimed);

    // RFC 9207 §2.4 — validate the `iss` callback parameter against the
    // recorded expected issuer before the code touches any token endpoint.
    await this.validateIssuer(command.iss, claimed, stateData);

    const tokenResponse = await this.exchangeCode({
      claimed,
      oauthClient,
      code: command.providerCode,
      pkceVerifier: claimed.oauthState?.pkceVerifier,
      resource: claimed.oauthState?.resource,
      stateData,
    });

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
        $unset: { oauthState: 1, lastError: 1 },
      }
    );

    return { status: 'connected' };
  }

  private requireOAuthClient(claimed: McpConnectionEntity): McpConnectionOAuthClient {
    if (!claimed.oauthClient) {
      // Should be unreachable: every row that reaches PendingOAuth went
      // through GenerateMcpOAuthUrl, which persists oauthClient before
      // returning the authorize URL. If it's missing, treat as a malformed
      // state rather than try to recover.
      throw new BadRequestException('OAuth client credentials missing on connection; restart the flow.');
    }
    const decrypted = decryptMcpConnectionOAuthClient(claimed.oauthClient);

    return decrypted;
  }

  private async validateIssuer(
    iss: string | undefined,
    claimed: McpConnectionEntity,
    stateData: McpOAuthState
  ): Promise<void> {
    const expectedIssuer = claimed.oauthState?.expectedIssuer;

    if (!expectedIssuer) {
      // No recorded expected issuer means the authorize URL pre-dated this
      // feature; we treat the callback as legitimate but log a warning.
      this.logger.warn(
        { connectionId: claimed._id, mcpId: stateData.mcpId },
        'MCP OAuth callback has no recorded expectedIssuer; skipping iss validation'
      );

      return;
    }

    let asIssParamSupported = false;
    try {
      const asMetadata = await this.discoveryService.discoverAuthorizationServer(expectedIssuer);
      asIssParamSupported = asMetadata.authorizationResponseIssParameterSupported;
    } catch (err) {
      // AS metadata cache may have evicted and the AS is unreachable for
      // a moment. Don't block the callback on a transient discovery failure;
      // if `iss` is present we still compare it below.
      this.logger.debug(
        { issuer: expectedIssuer, err: err instanceof Error ? err.message : String(err) },
        'AS metadata unavailable during callback; falling back to local iss check'
      );
    }

    if (iss) {
      if (iss !== expectedIssuer) {
        await this.markConnectionError(stateData, 'mcp_iss_mismatch', 'Authorization response issuer mismatch.');
        throw new BadRequestException({
          statusCode: 400,
          message: 'Authorization response issuer mismatch.',
          error: 'mcp_iss_mismatch',
        });
      }

      return;
    }

    if (asIssParamSupported) {
      // RFC 9207 §2.4 row 2: AS advertised iss support but didn't send one.
      await this.markConnectionError(stateData, 'mcp_iss_mismatch', 'Authorization response missing required iss.');
      throw new BadRequestException({
        statusCode: 400,
        message: 'Authorization response missing required iss.',
        error: 'mcp_iss_mismatch',
      });
    }
  }

  private async markConnectionError(stateData: McpOAuthState, code: string, error: string): Promise<void> {
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
          lastError: { code, message: error, at: new Date() },
        },
        $unset: { oauthState: 1 },
      }
    );
  }

  private async exchangeCode(args: {
    claimed: McpConnectionEntity;
    oauthClient: McpConnectionOAuthClient;
    code: string;
    pkceVerifier: string | undefined;
    resource: string | undefined;
    stateData: McpOAuthState;
  }): Promise<TokenResponse> {
    const { oauthClient, code, pkceVerifier, resource, stateData } = args;

    if (!pkceVerifier) {
      throw new BadRequestException('PKCE verifier missing on connection state; restart the flow.');
    }

    const params = new URLSearchParams({
      client_id: oauthClient.clientId,
      code,
      code_verifier: pkceVerifier,
      grant_type: 'authorization_code',
      redirect_uri: buildMcpOAuthRedirectUri(),
    });

    if (oauthClient.clientSecret) {
      params.set('client_secret', oauthClient.clientSecret);
    }

    if (resource) {
      params.set('resource', resource);
    }

    try {
      const response = await axios.post<TokenResponse>(oauthClient.tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        validateStatus: (status) => status >= 200 && status < 300,
        timeout: 10_000,
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
          tokenEndpoint: oauthClient.tokenEndpoint,
          status,
          providerError,
        },
        'MCP OAuth token exchange failed'
      );

      await this.markConnectionError(
        stateData,
        'mcp_token_exchange_failed',
        providerError ? `Token exchange failed: ${providerError}` : 'Token exchange failed.'
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
  // Strip ASCII control characters (U+0000–U+001F and U+007F) and clamp
  // length so attacker-supplied error text can't bloat the database or
  // break log output. The class is intentional, biome's
  // no-control-characters-in-regex would suppress this hygiene rule.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional sanitization
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
