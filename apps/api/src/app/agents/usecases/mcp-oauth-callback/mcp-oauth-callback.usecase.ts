import { BadRequestException, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import {
  createHash,
  decryptCredentials,
  decryptMcpConnectionOAuthClient,
  encryptCredentials,
  encryptMcpConnectionAuth,
  getAgentRuntimeProvider,
  type IAgentRuntimeProvider,
  PinoLogger,
  SsrfBlockedError,
  safeOutboundJsonRequest,
  splitOAuthState,
} from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  AgentRepository,
  EnvironmentRepository,
  IntegrationRepository,
  McpConnectionEntity,
  McpConnectionOAuthClient,
  McpConnectionRepository,
} from '@novu/dal';
import { MCP_SERVERS, McpConnectionAuthModeEnum, McpConnectionStatusEnum } from '@novu/shared';

import { McpOAuthDiscoveryService } from '../../services/mcp-oauth-discovery.service';
import { MCP_OAUTH_STATE_TTL_MS } from '../generate-mcp-oauth-url/mcp-oauth.constants';
import { buildMcpOAuthRedirectUri, type McpOAuthState } from '../generate-mcp-oauth-url/mcp-oauth-state';
import { SyncAgentMcpServersCommand } from '../sync-agent-mcp-servers/sync-agent-mcp-servers.command';
import { SyncAgentMcpServers } from '../sync-agent-mcp-servers/sync-agent-mcp-servers.usecase';
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
 * Handle the OAuth redirect for a `subscriber`-scoped MCP
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
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly discoveryService: McpOAuthDiscoveryService,
    private readonly syncAgentMcpServers: SyncAgentMcpServers,
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

    if (!catalog) {
      throw new BadRequestException(`Unknown MCP "${stateData.mcpId}".`);
    }

    if (!catalog.oauth) {
      throw new BadRequestException(`MCP "${stateData.mcpId}" does not have OAuth connectivity configured.`);
    }

    const oauthConfig = catalog.oauth;

    // Only DCR callbacks are wired today; `novu-app` and `user-app` ship
    // alongside their own callback paths in the follow-up PR.
    switch (oauthConfig.mode) {
      case McpConnectionAuthModeEnum.Dcr:
        break;
      case McpConnectionAuthModeEnum.NovuApp:
      case McpConnectionAuthModeEnum.UserApp:
        throw new NotImplementedException(
          `MCP "${stateData.mcpId}" auth mode "${oauthConfig.mode}" is not yet supported.`
        );
      default: {
        const _exhaustive: never = oauthConfig;

        throw new Error(`Unhandled MCP OAuth mode: ${JSON.stringify(_exhaustive)}`);
      }
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

    // Atomically claim the pending row before talking to the OAuth provider.
    // The filter requires `oauthState.callbackClaimedAt` to be ABSENT and the
    // update sets it to `now()`, so MongoDB only matches the row for the
    // first arriving callback; concurrent callbacks for the same signed
    // state see no match and bail out below. This closes the race where two
    // requests could both pass a non-mutating gate and each exchange the
    // authorization code (RFC 6749 §4.1.2 forbids reusing the code).
    const callbackClaimedAt = new Date();
    const claimed = await this.mcpConnectionRepository.findOneAndUpdate(
      {
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
        _agentMcpServerId: stateData.agentMcpServerId,
        _subscriberId: stateData.subscriberId,
        scope: stateData.scope,
        status: McpConnectionStatusEnum.PendingOAuth,
        'oauthState.callbackClaimedAt': { $exists: false },
      },
      {
        $set: { 'oauthState.callbackClaimedAt': callbackClaimedAt },
        $unset: { lastError: 1 },
      },
      { new: true }
    );

    if (!claimed) {
      throw new BadRequestException(
        'OAuth callback rejected: connection is not awaiting authorisation, or has already been claimed by a concurrent callback. Restart the flow.'
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

    const plainAuth = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: expiresAt?.toISOString(),
      tokenType: tokenResponse.token_type,
      scopes: tokenResponse.scope ? tokenResponse.scope.split(/\s+/).filter(Boolean) : undefined,
    } as const;

    const auth = encryptMcpConnectionAuth({
      accessToken: plainAuth.accessToken,
      refreshToken: plainAuth.refreshToken,
      expiresAt,
      tokenType: plainAuth.tokenType,
      scopes: plainAuth.scopes,
    });

    await this.mcpConnectionRepository.update(
      {
        _id: claimed._id,
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
      },
      {
        $set: {
          authMode: McpConnectionAuthModeEnum.Dcr,
          status: McpConnectionStatusEnum.Connected,
          auth,
          connectedAt: new Date(),
        },
        $unset: { oauthState: 1, lastError: 1 },
      }
    );

    try {
      await this.runPostConnectActions({
        connection: claimed,
        stateData,
        plainAuth,
        oauthClient,
        mcpServerUrl: catalog.url,
        mcpServerName: catalog.name,
      });
    } catch (err) {
      this.logger.error(
        { err, connectionId: claimed._id, mcpId: stateData.mcpId },
        'Post-connect actions failed (vault push / sync / replay)'
      );
      const message = err instanceof Error ? sanitizeErrorMessage(err.message) : 'Post-connect failure';

      await this.mcpConnectionRepository.update(
        {
          _id: claimed._id,
          _environmentId: stateData.environmentId,
          _organizationId: stateData.organizationId,
        },
        {
          $set: {
            status: McpConnectionStatusEnum.Error,
            lastError: { code: 'mcp_post_connect_failed', message, at: new Date() },
          },
        }
      );

      return { status: 'error', message };
    }

    return { status: 'connected' };
  }

  /**
   * After the encrypted token blob has been persisted to mongo, fan out the
   * three side effects that complete the lazy-OAuth flow:
   *
   *   1. Push the credential to the runtime provider's vault when the
   *      provider exposes one (`capabilities.tokenVault === true`). Persists
   *      the returned `vaultCredentialId` so disable/refresh can target it.
   *   2. Re-run `SyncAgentMcpServers` so the upstream `agent.mcp_servers`
   *      projection is fresh (idempotent; cheap).
   *
   * Throws on vault-push failure so the caller can mark the connection
   * `error` — the user retries by clicking the Connect button again. Sync
   * failures are logged but never block the connection from landing in
   * `Connected`.
   */
  private async runPostConnectActions(args: {
    connection: McpConnectionEntity;
    stateData: McpOAuthState;
    plainAuth: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: string;
      tokenType?: string;
      scopes?: string[];
    };
    oauthClient: McpConnectionOAuthClient;
    mcpServerUrl: string;
    mcpServerName: string;
  }): Promise<void> {
    const { connection, stateData, plainAuth, oauthClient, mcpServerUrl, mcpServerName } = args;
    const runtime = await this.resolveRuntime(stateData);

    if (!runtime) {
      // Agent / integration was deleted between authorize and callback —
      // nothing to project / push, but the connection itself is still valid.
      return;
    }

    if (runtime.runtimeProvider.capabilities.tokenVault) {
      const result = await runtime.runtimeProvider.upsertVaultCredential({
        integrationCredentials: runtime.integrationCredentials,
        mcpServerUrl,
        displayName: mcpServerName,
        auth: {
          ...plainAuth,
          oauthClient: {
            clientId: oauthClient.clientId,
            clientSecret: oauthClient.clientSecret,
            tokenEndpoint: oauthClient.tokenEndpoint,
            resource: connection.oauthState?.resource,
          },
        },
        existingCredentialId: connection.auth?.vaultCredentialId,
      });

      // Provider may have lazy-provisioned integration-scoped resources
      // (e.g. a vault for a legacy integration) during the upsert — persist
      // those updates BEFORE the connection write so subsequent OAuth flows
      // on this integration find the new ids on the integration row.
      if (result.integrationCredentialsUpdate) {
        await this.persistIntegrationCredentialsUpdate({
          integrationId: runtime.integrationId,
          environmentId: stateData.environmentId,
          organizationId: stateData.organizationId,
          update: result.integrationCredentialsUpdate,
        });
      }

      await this.mcpConnectionRepository.update(
        {
          _id: connection._id,
          _environmentId: stateData.environmentId,
          _organizationId: stateData.organizationId,
        },
        { $set: { 'auth.vaultCredentialId': result.vaultCredentialId } }
      );
    }

    try {
      await this.syncAgentMcpServers.execute(
        SyncAgentMcpServersCommand.create({
          environmentId: stateData.environmentId,
          organizationId: stateData.organizationId,
          agentId: stateData.agentId,
        })
      );
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), agentId: stateData.agentId },
        'SyncAgentMcpServers after OAuth callback failed (non-fatal)'
      );
    }
  }

  private async resolveRuntime(stateData: McpOAuthState): Promise<{
    runtimeProvider: IAgentRuntimeProvider;
    integrationId: string;
    integrationCredentials: Record<string, unknown>;
  } | null> {
    const agent = await this.agentRepository.findOne(
      {
        _id: stateData.agentId,
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
      },
      ['_id', 'runtime', 'managedRuntime']
    );

    if (!agent?.managedRuntime) {
      return null;
    }

    const integration = await this.integrationRepository.findOne({
      _id: agent.managedRuntime._integrationId,
      _environmentId: stateData.environmentId,
    });

    if (!integration?.credentials) {
      return null;
    }

    const creds = decryptCredentials(integration.credentials);

    if (!creds.apiKey) {
      return null;
    }

    return {
      runtimeProvider: getAgentRuntimeProvider(agent.managedRuntime.providerId, creds.apiKey),
      integrationId: integration._id,
      integrationCredentials: creds as Record<string, unknown>,
    };
  }

  /**
   * Merge a partial credentials update returned by the runtime provider
   * (typically a lazy-provisioned `externalVaultId`) back onto the integration.
   *
   * Re-decrypts the integration row inside this call so we don't race with any
   * other writers that may have rotated the API key between our `resolveRuntime`
   * read and this update. Failures are surfaced — the caller treats them as
   * vault-push failures, since a vault credential that the integration row
   * doesn't know about is effectively orphaned.
   */
  private async persistIntegrationCredentialsUpdate(args: {
    integrationId: string;
    environmentId: string;
    organizationId: string;
    update: Record<string, unknown>;
  }): Promise<void> {
    const { integrationId, environmentId, organizationId, update } = args;

    const integration = await this.integrationRepository.findOne({
      _id: integrationId,
      _environmentId: environmentId,
      _organizationId: organizationId,
    });

    if (!integration?.credentials) {
      throw new Error(
        `Cannot persist credentials update for integration "${integrationId}": integration or credentials missing`
      );
    }

    const merged = { ...decryptCredentials(integration.credentials), ...update };

    await this.integrationRepository.update(
      {
        _id: integrationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      { $set: { credentials: encryptCredentials(merged) } }
    );
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
      // The token endpoint URL comes from AS metadata that was discovered at
      // authorize-URL time. Even though we re-validated the issuer above, the
      // metadata document is still upstream-controlled, so we MUST route the
      // POST through the SSRF-safe client to ensure the URL is re-checked on
      // every hop (no private-IP rebinding between discovery and token
      // exchange). The body is a plain `application/x-www-form-urlencoded`
      // payload — `safeOutboundJsonRequest` parses the response as JSON,
      // which is the only token-endpoint content-type we ever care about.
      const response = await safeOutboundJsonRequest<unknown>({
        url: oauthClient.tokenEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body: params.toString(),
        timeoutMs: 10_000,
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        const providerError = pickProviderErrorCode(response.body);
        this.logger.warn(
          {
            tokenEndpoint: oauthClient.tokenEndpoint,
            status: response.statusCode,
            providerError,
          },
          'MCP OAuth token exchange returned non-2xx'
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

      const parsed = parseTokenResponseBody(response.body);
      if (!parsed) {
        // 2xx with malformed body — never let it propagate to encryption /
        // update so we can't persist a broken connection. Funnels into the
        // same sanitized error path used for non-2xx responses.
        this.logger.warn(
          { tokenEndpoint: oauthClient.tokenEndpoint, status: response.statusCode },
          'MCP OAuth token exchange returned a malformed 2xx body'
        );

        await this.markConnectionError(
          stateData,
          'mcp_token_exchange_failed',
          'Token exchange returned a malformed response.'
        );

        throw new BadRequestException('OAuth token exchange returned a malformed response.');
      }

      return parsed;
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      if (err instanceof SsrfBlockedError) {
        this.logger.warn(
          { tokenEndpoint: oauthClient.tokenEndpoint, reason: err.reason },
          'MCP OAuth token exchange blocked by SSRF policy'
        );

        await this.markConnectionError(
          stateData,
          'mcp_token_exchange_failed',
          'Token endpoint resolves to a non-routable address.'
        );

        throw new BadRequestException('OAuth token endpoint is not reachable.');
      }

      const message = err instanceof Error ? err.message : 'unknown error';
      this.logger.warn(
        { tokenEndpoint: oauthClient.tokenEndpoint, errorMessage: message },
        'MCP OAuth token exchange failed'
      );

      await this.markConnectionError(stateData, 'mcp_token_exchange_failed', 'Token exchange failed.');

      throw new BadRequestException('OAuth token exchange failed.');
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

function pickProviderErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const data = body as { error?: unknown; message?: unknown };

  // OAuth 2 standard: `error` is a short token (e.g. "invalid_grant").
  // Accept `message` as a generic fallback. Never log/return the full
  // body — it may contain access tokens.
  if (typeof data.error === 'string' && data.error.length > 0 && data.error.length <= 64) {
    return data.error;
  }
  if (typeof data.message === 'string' && data.message.length > 0 && data.message.length <= 64) {
    return data.message;
  }

  return undefined;
}

/**
 * Validate the upstream token response shape before we hand it to encryption
 * + persistence. RFC 6749 §5.1 requires `access_token` and `token_type`;
 * `expires_in` / `refresh_token` / `scope` are optional but typed when
 * present. A response that does not match is treated as a token-exchange
 * failure rather than silently writing a broken `mcp_connection` row.
 */
function parseTokenResponseBody(body: unknown): TokenResponse | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;

  if (typeof data.access_token !== 'string' || data.access_token.length === 0) return null;

  const refreshToken = typeof data.refresh_token === 'string' ? data.refresh_token : undefined;
  const expiresIn =
    typeof data.expires_in === 'number' && Number.isFinite(data.expires_in) ? data.expires_in : undefined;
  const tokenType = typeof data.token_type === 'string' ? data.token_type : undefined;
  const scope = typeof data.scope === 'string' ? data.scope : undefined;

  return {
    access_token: data.access_token,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    token_type: tokenType,
    scope,
  };
}
