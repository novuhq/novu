import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  createHash,
  decryptMcpConnectionOAuthClient,
  encryptMcpConnectionAuth,
  type IAgentRuntimeProvider,
  PinoLogger,
  resolveAgentRuntime,
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
import {
  MCP_SERVERS,
  McpConnectionAuthModeEnum,
  McpConnectionStatusEnum,
  type McpOAuthCatalogEntry,
  type McpTokenEndpointAuthMethod,
  resolvePersistedMcpTokenEndpointAuthMethod,
} from '@novu/shared';
import { CompleteManagedAgentSetup } from '../../../managed-runtime/setup/complete-managed-agent-setup.usecase';
import { ManagedAgentSetupCompleteCommand } from '../../../managed-runtime/setup/managed-agent-setup-complete.command';
import {
  trackAgentMcpOAuthCompleted,
  trackAgentMcpOAuthFailed,
} from '../../../shared/analytics/agent-analytics';
import { McpNovuAppCredentialsService } from '../../connections/get-mcp-novu-app-credentials/get-mcp-novu-app-credentials.service';
import { McpConnectionVaultService } from '../../connections/mcp-connection-vault.service';
import { SyncAgentMcpServersCommand } from '../../servers/sync-agent-mcp-servers/sync-agent-mcp-servers.command';
import { SyncAgentMcpServers } from '../../servers/sync-agent-mcp-servers/sync-agent-mcp-servers.usecase';
import { MCP_OAUTH_STATE_TTL_MS } from '../generate-mcp-oauth-url/mcp-oauth.constants';
import { buildMcpOAuthRedirectUri, type McpOAuthState } from '../generate-mcp-oauth-url/mcp-oauth-state';
import {
  McpOAuthDiscoveryError,
  McpOAuthDiscoveryService,
  type McpOAuthErrorCode,
} from '../mcp-oauth-discovery.service';
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
    private readonly mcpConnectionVaultService: McpConnectionVaultService,
    private readonly completeManagedAgentSetup: CompleteManagedAgentSetup,
    private readonly getNovuAppCredentials: McpNovuAppCredentialsService,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(McpOAuthCallback.name);
  }

  async execute(command: McpOAuthCallbackCommand): Promise<McpOAuthCallbackResult> {
    const stateData = await this.decodeAndValidateState(command.state);

    if (command.error) {
      // OAuth 2 §4.1.2.1 — the AS-returned `error` param is attacker-influenced
      // up to a short token. Map the standard `access_denied` to our
      // specific `mcp_user_denied` code so the dashboard can render
      // "You cancelled the consent" copy instead of generic failure.
      //
      // The controller concatenates `error` and `error_description` into a
      // single string (e.g. "access_denied - The user cancelled"), so we
      // pick off the OAuth error token from the head of the string before
      // matching against the well-known codes.
      const safeMessage = sanitizeErrorMessage(command.error);
      const errorToken = parseUpstreamErrorToken(command.error);
      const errorCode: McpOAuthErrorCode | 'oauth_callback_error' = mapUpstreamCallbackErrorCode(errorToken);
      await this.markConnectionError(stateData, errorCode, safeMessage);
      this.trackOAuthFailed(stateData, errorCode);

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

    const oauthConfig: McpOAuthCatalogEntry = catalog.oauth;

    switch (oauthConfig.mode) {
      case McpConnectionAuthModeEnum.Dcr:
      case McpConnectionAuthModeEnum.NovuApp:
        break;
      case McpConnectionAuthModeEnum.UserApp:
        throw new BadRequestException(`MCP "${stateData.mcpId}" auth mode "${oauthConfig.mode}" is not yet supported.`);
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

    let oauthClient: McpConnectionOAuthClient;
    try {
      oauthClient = this.resolveOAuthClientForExchange(claimed, oauthConfig, stateData);
    } catch (err) {
      if (err instanceof McpOAuthDiscoveryError) {
        // The credential resolver raises a `McpOAuthDiscoveryError` when
        // env vars vanished between authorize and callback. We mark the
        // row, then re-throw as `BadRequestException` so the controller's
        // standard redirect/fallback page kicks in instead of bubbling a
        // 500 to the browser. The structured body carries the typed
        // error code so the dashboard can render specific copy once
        // `McpConnectionResponseDto` exposes `lastError`.
        await this.markConnectionError(stateData, err.code, err.message);

        throw new BadRequestException({
          statusCode: 400,
          message: err.message,
          error: err.code,
        });
      }

      throw err;
    }

    // RFC 9207 §2.4 — validate the `iss` callback parameter against the
    // recorded expected issuer before the code touches any token endpoint.
    // For novu-app the catalog already declares the upstream publishes no
    // AS metadata, so we pass the mode and skip the well-known probe.
    await this.validateIssuer(command.iss, claimed, stateData, oauthConfig.mode);

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
          authMode: oauthConfig.mode,
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

      this.trackOAuthFailed(stateData, 'mcp_post_connect_failed', oauthConfig.mode);

      return { status: 'error', message };
    }

    this.trackOAuthCompleted(stateData, claimed._id, oauthConfig.mode);

    return { status: 'connected' };
  }

  private trackOAuthCompleted(stateData: McpOAuthState, connectionId: string, authMode: McpConnectionAuthModeEnum): void {
    trackAgentMcpOAuthCompleted(this.analyticsService, {
      userId: resolveMcpOAuthAnalyticsUserId(stateData),
      organizationId: stateData.organizationId,
      environmentId: stateData.environmentId,
      agentId: stateData.agentId,
      mcpId: stateData.mcpId,
      authMode,
      scope: stateData.scope,
      connectionId,
      source: resolveMcpOAuthAnalyticsSource(stateData),
      conversationId: stateData.conversationId,
    });
  }

  private trackOAuthFailed(
    stateData: McpOAuthState,
    errorCode: string,
    authMode?: McpConnectionAuthModeEnum
  ): void {
    trackAgentMcpOAuthFailed(this.analyticsService, {
      userId: resolveMcpOAuthAnalyticsUserId(stateData),
      organizationId: stateData.organizationId,
      environmentId: stateData.environmentId,
      agentId: stateData.agentId,
      mcpId: stateData.mcpId,
      authMode,
      scope: stateData.scope,
      errorCode,
      source: resolveMcpOAuthAnalyticsSource(stateData),
      conversationId: stateData.conversationId,
    });
  }

  /**
   * After the encrypted token blob has been persisted to mongo, fan out
   * post-connect side effects for the managed-agent MCP OAuth flow:
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
      const externalVaultId = await this.mcpConnectionVaultService.ensureConnectionVault({
        connection,
        agentId: stateData.agentId,
        runtimeProvider: runtime.runtimeProvider,
      });

      const result = await runtime.runtimeProvider.upsertVaultCredential({
        integrationCredentials: runtime.integrationCredentials,
        externalVaultId,
        mcpServerUrl,
        displayName: mcpServerName,
        auth: {
          ...plainAuth,
          oauthClient: {
            clientId: oauthClient.clientId,
            clientSecret: oauthClient.clientSecret,
            tokenEndpoint: oauthClient.tokenEndpoint,
            resource: connection.oauthState?.resource,
            tokenEndpointAuthMethod: oauthClient.tokenEndpointAuthMethod,
          },
        },
        existingCredentialId: connection.auth?.vaultCredentialId,
      });

      await this.mcpConnectionRepository.update(
        {
          _id: connection._id,
          _environmentId: stateData.environmentId,
          _organizationId: stateData.organizationId,
        },
        {
          $set: {
            'auth.vaultCredentialId': result.vaultCredentialId,
            'auth.externalVaultId': externalVaultId,
          },
        }
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

    try {
      // update the agent setup/onboarding card to show the connected MCP
      await this.completeManagedAgentSetup.execute(ManagedAgentSetupCompleteCommand.create({ stateData }));
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), conversationId: stateData.conversationId },
        'Managed agent setup completion after OAuth callback failed (non-fatal)'
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

    const resolved = resolveAgentRuntime(agent.managedRuntime.providerId, integration.credentials);

    if (!resolved) {
      return null;
    }

    return {
      runtimeProvider: resolved.provider,
      integrationId: integration._id,
      integrationCredentials: resolved.credentials as Record<string, unknown>,
    };
  }

  /**
   * Build the `McpConnectionOAuthClient` shape the rest of the callback
   * pipeline (token exchange, vault push, post-connect actions) consumes.
   *
   * - DCR: decrypt the row-persisted `oauthClient` (issued at authorize
   *   time by `GenerateMcpOAuthUrl`).
   *
   * - novu-app: reconstruct an EPHEMERAL `McpConnectionOAuthClient` from
   *   the env-loaded credentials + the AS endpoints that were copied onto
   *   `oauthState` at authorize time. Nothing is persisted back to Mongo
   *   for novu-app rows — the credentials live in env vars and the
   *   endpoints stay on `oauthState` until the row lands in `connected`.
   *
   * Credential resolution errors (`mcp_novu_app_credentials_missing`)
   * propagate as `McpOAuthDiscoveryError` so the caller can map them onto
   * `lastError.code` without exposing env-var values in the response.
   */
  private resolveOAuthClientForExchange(
    claimed: McpConnectionEntity,
    oauthConfig: McpOAuthCatalogEntry,
    stateData: McpOAuthState
  ): McpConnectionOAuthClient {
    if (oauthConfig.mode === McpConnectionAuthModeEnum.Dcr) {
      if (!claimed.oauthClient) {
        // Should be unreachable: every DCR row that reaches PendingOAuth
        // went through GenerateMcpOAuthUrl, which persists oauthClient
        // before returning the authorize URL. If it's missing, treat as a
        // malformed state rather than try to recover.
        throw new BadRequestException('OAuth client credentials missing on connection; restart the flow.');
      }

      return decryptMcpConnectionOAuthClient(claimed.oauthClient);
    }

    // novu-app: the row was written WITHOUT an oauthClient field, and the
    // endpoints come from `oauthState` (NOT the catalog — the catalog may
    // have rotated between authorize and callback, but the row's
    // `expectedIssuer` is the contract). The credentials come from env
    // vars resolved at callback time.
    const tokenEndpoint = claimed.oauthState?.tokenEndpoint;
    const authorizationEndpoint = claimed.oauthState?.authorizationEndpoint;
    const expectedIssuer = claimed.oauthState?.expectedIssuer;

    if (!tokenEndpoint || !authorizationEndpoint || !expectedIssuer) {
      throw new BadRequestException(
        'novu-app OAuth state missing AS endpoints; restart the flow so the authorize-URL request re-records them.'
      );
    }

    const credentials = this.getNovuAppCredentials.execute(stateData.mcpId);

    // `claimed.createdAt` is set by Mongoose timestamps and is always
    // present on a row that has reached PendingOAuth — but be explicit
    // so a malformed row is rejected rather than silently rewriting
    // history with "now" in vault metadata.
    if (typeof claimed.createdAt !== 'string' || claimed.createdAt.length === 0) {
      throw new BadRequestException('Connection createdAt is missing; restart the flow.');
    }

    // The novu-app scope list ultimately lives on the catalog (the
    // authorize URL builder writes it into the consent request). Carry it
    // forward onto the ephemeral oauthClient so vault push and audit
    // surfaces match the DCR shape, which always sets `scopesGranted`.
    const scopesGranted = oauthConfig.mode === McpConnectionAuthModeEnum.NovuApp ? oauthConfig.scopes : undefined;

    return {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      issuer: expectedIssuer,
      authorizationEndpoint,
      tokenEndpoint,
      scopesGranted,
      // novu-app rows never go through DCR negotiation, so they intentionally
      // carry no persisted `tokenEndpointAuthMethod`:
      // `resolvePersistedMcpTokenEndpointAuthMethod(undefined)` resolves to the
      // RFC 8414 §2 default of `client_secret_basic` (credentials in an HTTP
      // Basic header, never replayed in the body). This is the deliberate,
      // documented default for novu-app — see the `client_secret_basic` e2e
      // assertion in `agent-mcp-servers.e2e.ts`. GitHub (the only current
      // novu-app provider) accepts it; a future provider that strictly
      // requires `client_secret_post` would set the method explicitly here.
      registeredAt: new Date(claimed.createdAt),
    };
  }

  private async validateIssuer(
    iss: string | undefined,
    claimed: McpConnectionEntity,
    stateData: McpOAuthState,
    mode: McpConnectionAuthModeEnum
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
    if (mode === McpConnectionAuthModeEnum.NovuApp) {
      // novu-app catalog entries upstreams (e.g. GitHub) publish no
      // RFC 8414 / OIDC AS metadata — the catalog comment says so and the
      // pre-implementation probe verified it returns 404. The well-known
      // discovery LRU never caches failures, so probing here would burn a
      // 10s outbound timeout on every single callback. Skip outright.
    } else {
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

  private async markConnectionError(
    stateData: McpOAuthState,
    code: McpOAuthErrorCode | 'oauth_callback_error' | 'mcp_post_connect_failed',
    error: string
  ): Promise<void> {
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
      code,
      code_verifier: pkceVerifier,
      grant_type: 'authorization_code',
      redirect_uri: buildMcpOAuthRedirectUri(),
    });

    if (resource) {
      params.set('resource', resource);
    }

    // `tokenEndpointAuthMethod` is the value negotiated against the AS's
    // `token_endpoint_auth_methods_supported` list at DCR time (RFC 8414).
    // Legacy rows registered before negotiation existed have no value
    // persisted — `resolvePersistedMcpTokenEndpointAuthMethod` defaults to
    // `client_secret_basic` per RFC 8414 §2 so existing connections keep
    // working without a backfill migration.
    const authMethod = resolvePersistedMcpTokenEndpointAuthMethod(oauthClient.tokenEndpointAuthMethod);
    const tokenHeaders = buildTokenExchangeAuth({ authMethod, oauthClient, params });

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
        headers: tokenHeaders,
        body: params.toString(),
        timeoutMs: 10_000,
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        const providerError = pickProviderErrorCode(response.body);
        const mappedCode = mapTokenExchangeErrorCode(response.statusCode, providerError);
        this.logger.warn(
          {
            tokenEndpoint: oauthClient.tokenEndpoint,
            status: response.statusCode,
            providerError,
            mappedCode,
          },
          'MCP OAuth token exchange returned non-2xx'
        );

        await this.markConnectionError(
          stateData,
          mappedCode,
          providerError ? `Token exchange failed: ${providerError}` : 'Token exchange failed.'
        );

        throw new BadRequestException(
          providerError ? `OAuth token exchange failed: ${providerError}` : 'OAuth token exchange failed.'
        );
      }

      // 2xx with a JSON `error` field — GitHub's `/login/oauth/access_token`
      // returns 200 + `{ "error": "bad_verification_code" }` on token-side
      // failures (yes, really) instead of a 4xx, so we re-run the same
      // mapping on the body before treating it as success.
      const inlineProviderError = pickProviderErrorCode(response.body);
      if (inlineProviderError) {
        const mappedCode = mapTokenExchangeErrorCode(response.statusCode, inlineProviderError);
        this.logger.warn(
          {
            tokenEndpoint: oauthClient.tokenEndpoint,
            status: response.statusCode,
            providerError: inlineProviderError,
            mappedCode,
          },
          'MCP OAuth token exchange returned 2xx with inline error'
        );

        await this.markConnectionError(stateData, mappedCode, `Token exchange failed: ${inlineProviderError}`);

        throw new BadRequestException(`OAuth token exchange failed: ${inlineProviderError}`);
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

/**
 * Build the token-exchange request's `Authorization` headers and mutate the
 * URL-encoded body in place to carry the negotiated `token_endpoint_auth_method`.
 *
 * The exhaustive switch on `McpTokenEndpointAuthMethod` forces the type
 * checker to flag any new method (e.g. `private_key_jwt`) added to the union
 * — otherwise a fall-through would silently downgrade a confidential client
 * to public-client semantics.
 *
 * A secret-bearing method (`client_secret_basic` or `client_secret_post`)
 * without a `clientSecret` is an invariant violation (DCR negotiation
 * guarantees a secret when either method is selected) and surfaces as a 500,
 * not a silent fallback to public-client semantics.
 */
export function buildTokenExchangeAuth(args: {
  authMethod: McpTokenEndpointAuthMethod;
  oauthClient: McpConnectionOAuthClient;
  params: URLSearchParams;
}): Record<string, string> {
  const { authMethod, oauthClient, params } = args;
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    accept: 'application/json',
  };

  switch (authMethod) {
    case 'client_secret_basic': {
      if (!oauthClient.clientSecret) {
        throw new Error(
          'MCP OAuth client registered with `client_secret_basic` is missing a client secret — refusing to downgrade to public-client semantics.'
        );
      }
      // RFC 6749 §2.3.1 / RFC 7617 — credentials carried in an HTTP Basic
      // header instead of the form body. The client id and secret must be
      // form-urlencoded BEFORE base64-ing per RFC 6749 (otherwise secrets
      // containing `:` or `+` produce a malformed credential).
      const basic = `${encodeURIComponent(oauthClient.clientId)}:${encodeURIComponent(oauthClient.clientSecret)}`;
      headers.Authorization = `Basic ${Buffer.from(basic, 'utf8').toString('base64')}`;

      return headers;
    }
    case 'client_secret_post': {
      // `client_id` always travels in the body when not in the Authorization
      // header so the AS can correlate the request to the registration.
      params.set('client_id', oauthClient.clientId);
      if (!oauthClient.clientSecret) {
        throw new Error(
          'MCP OAuth client registered with `client_secret_post` is missing a client secret — refusing to downgrade to public-client semantics.'
        );
      }
      params.set('client_secret', oauthClient.clientSecret);

      return headers;
    }
    case 'none': {
      params.set('client_id', oauthClient.clientId);

      return headers;
    }
    default: {
      const _exhaustive: never = authMethod;

      throw new Error(`Unknown token_endpoint_auth_method: ${_exhaustive as string}`);
    }
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

/**
 * The controller concatenates `?error=…&error_description=…` into one
 * string (`"<token> - <free-form description>"`). Pull the OAuth `error`
 * token off the head so the mapping switches don't have to deal with the
 * description tail. Returns `undefined` for blank/missing input so callers
 * can fall through to the generic code.
 */
export function parseUpstreamErrorToken(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  // OAuth 2 §4.1.2.1 — `error` is a single VSCHAR-only token; never
  // contains whitespace. Split on whitespace or the ` - ` separator the
  // controller uses to glue in `error_description`.
  const [head] = trimmed.split(/\s|-/, 1);

  return head ?? undefined;
}

/**
 * Map an AS-returned `error` token (from the authorize redirect, NOT the
 * token endpoint) onto our error code union. Token-endpoint mapping uses
 * the richer `mapTokenExchangeErrorCode`; this helper handles only the
 * codes a real AS can send to the redirect.
 */
export function mapUpstreamCallbackErrorCode(
  errorToken: string | undefined
): McpOAuthErrorCode | 'oauth_callback_error' {
  if (errorToken === 'access_denied') {
    return 'mcp_user_denied';
  }

  return 'oauth_callback_error';
}

/**
 * Map an upstream OAuth token-exchange error onto our `McpOAuthErrorCode`
 * union. Conservative by default — anything we don't explicitly recognise
 * lands on the generic `mcp_token_exchange_failed` so the dashboard
 * doesn't render misleading copy.
 *
 * Currently recognised:
 *  - `access_denied`                                       → `mcp_user_denied`
 *  - `application_suspended` / `app_blocked` / 403 + "Resource not accessible by integration"
 *                                                          → `mcp_github_org_block`
 *  - everything else                                       → `mcp_token_exchange_failed`
 *
 * The `providerError` value is the sanitized OAuth `error` token (or
 * `message` fallback) — never the full body — so it's safe to switch on.
 *
 * `mcp_app_not_installed` is exported on the error union for future use
 * (a disconnect or installation-check flow could emit it by hitting
 * `/applications/{client_id}/token` — see the plan's "Non-Goals"). The
 * `/login/oauth/access_token` endpoint does NOT 404 for missing org
 * approval — the consent screen simply never returns — so we deliberately
 * do not map 404 here to avoid mis-labelling unrelated transport errors.
 */
export function mapTokenExchangeErrorCode(statusCode: number, providerError: string | undefined): McpOAuthErrorCode {
  const normalised = providerError?.toLowerCase() ?? '';

  if (normalised === 'access_denied') {
    return 'mcp_user_denied';
  }
  if (normalised === 'application_suspended' || normalised === 'app_blocked') {
    return 'mcp_github_org_block';
  }
  // GitHub surfaces the org-block as a 403 + body
  // `"Resource not accessible by integration"` from the REST surface; the
  // OAuth endpoint usually returns one of the codes above, but accept the
  // free-form message as a fallback.
  if (statusCode === 403 && normalised.includes('resource not accessible')) {
    return 'mcp_github_org_block';
  }

  return 'mcp_token_exchange_failed';
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

function resolveMcpOAuthAnalyticsSource(stateData: McpOAuthState): 'api' | 'setup_card' {
  if (stateData.source) {
    return stateData.source;
  }

  return stateData.conversationId ? 'setup_card' : 'api';
}

function resolveMcpOAuthAnalyticsUserId(stateData: McpOAuthState): string {
  return stateData.userId ?? stateData.organizationId;
}
