import { createHash as nodeCreateHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  createHash,
  decryptMcpConnectionOAuthClient,
  encodeOAuthState,
  encryptMcpConnectionOAuthClient,
  FeatureFlagsService,
  PinoLogger,
} from '@novu/application-generic';
import {
  AgentMcpServerEntity,
  AgentMcpServerRepository,
  AgentRepository,
  EnvironmentRepository,
  McpConnectionEntity,
  McpConnectionOAuthClient,
  McpConnectionOAuthState,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  type DcrOAuthCatalogEntry,
  MCP_SERVERS,
  McpConnectionAuthModeEnum,
  McpConnectionScopeEnum,
  McpConnectionStatusEnum,
  type McpOAuthCatalogEntry,
  type McpServer,
  type NovuAppOAuthCatalogEntry,
} from '@novu/shared';
import { GenerateMcpOAuthUrlResponseDto } from '../../../shared/dtos/mcp-server.dto';
import { assertMcpNovuAppFlagEnabled } from '../../assert-mcp-novu-app-flag-enabled';
import {
  McpNovuAppCredentialsService,
  type NovuAppCredentials,
} from '../../connections/get-mcp-novu-app-credentials/get-mcp-novu-app-credentials.service';
import {
  AuthorizationServerMetadata,
  DiscoveredProtectedResource,
  McpOAuthDiscoveryError,
  McpOAuthDiscoveryService,
  type SupportedTokenEndpointAuthMethod,
  selectTokenEndpointAuthMethod,
} from '../mcp-oauth-discovery.service';
import { GenerateMcpOAuthUrlCommand } from './generate-mcp-oauth-url.command';
import { buildMcpOAuthRedirectUri, type McpOAuthState } from './mcp-oauth-state';
import { pickReusableOAuthClient } from './pick-reusable-oauth-client';

type ResolvedOAuthConfig =
  | { mode: McpConnectionAuthModeEnum.Dcr; catalog: DcrOAuthCatalogEntry }
  | { mode: McpConnectionAuthModeEnum.NovuApp; catalog: NovuAppOAuthCatalogEntry; credentials: NovuAppCredentials };

const NOVU_MCP_CLIENT_NAME = 'Novu';
const DEFAULT_SOFTWARE_ID = 'novu-mcp-client';
const SOFTWARE_VERSION = process.env.NOVU_API_VERSION || 'dev';

/**
 * Build the provider authorize URL for a `subscriber`-scoped MCP
 * OAuth flow. Branches on the catalog's `oauth.mode`:
 *
 * - `dcr` (MCP-spec default): discovers PRM (RFC 9728), discovers AS metadata
 *   (RFC 8414 / OIDC), reuses or registers a per-subscriber DCR client
 *   (RFC 7591) and persists it on the row. Refuses to proceed unless
 *   `S256` is advertised.
 *
 * - `novu-app`: GitHub-style upstreams that publish NEITHER AS metadata
 *   NOR DCR. PRM probe still runs (non-fatal — synthesised PRM is used on
 *   failure), AS metadata discovery is skipped entirely, and the catalog
 *   pins the authorize/token endpoints + scope list. The pre-registered
 *   `client_id`/`client_secret` come from server env vars (resolved per
 *   request through `McpNovuAppCredentialsService`). No `oauthClient` row is
 *   persisted; instead the AS endpoints land on `oauthState` so the
 *   callback can do the token exchange without re-consulting the catalog.
 *   Gated by `IS_MCP_NOVU_APP_ENABLED`.
 *
 * Common to both modes:
 *  - Generate a PKCE S256 challenge, record `expectedIssuer` + canonical
 *    `resource` on `oauthState`, sign the redirect state with the env API key.
 *  - Return the authorize URL with `client_id`, `redirect_uri`,
 *    `response_type=code`, `scope`, `state`, `code_challenge`,
 *    `code_challenge_method=S256`, and `resource` (RFC 8707).
 */
@Injectable()
export class GenerateMcpOAuthUrl {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly discoveryService: McpOAuthDiscoveryService,
    private readonly getNovuAppCredentials: McpNovuAppCredentialsService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(GenerateMcpOAuthUrl.name);
  }

  /**
   * Build an authorize URL for a managed-agent setup card without rotating
   * PKCE when a reusable `pending_oauth` session already exists for this
   * subscriber + MCP. Each card only gets a fresh signed `state` (with its
   * `conversationId`); the shared connection row stays stable across threads.
   */
  async executeForSetupCard(command: GenerateMcpOAuthUrlCommand): Promise<GenerateMcpOAuthUrlResponseDto> {
    const context = await this.loadAuthorizeContext(command);

    if (canReusePendingOAuthSession(context.existing)) {
      return this.buildAuthorizeUrlForExistingPending(context, command);
    }

    return this.execute(command);
  }

  async execute(command: GenerateMcpOAuthUrlCommand): Promise<GenerateMcpOAuthUrlResponseDto> {
    const context = await this.loadAuthorizeContext(command);
    const { catalog, oauthConfig, enablement, agent, subscriber, existing } = context;

    const pkceVerifier = generatePkceVerifier();

    if (oauthConfig.mode === McpConnectionAuthModeEnum.NovuApp) {
      const resolved = await this.resolveServerEndpointsForNovuApp(catalog, oauthConfig);

      // novu-app catalog entries hand-pin `issuer` and `authorizationEndpoint`
      // as sibling literals in MCP_SERVERS, so a same-origin guard here is a
      // cheap way to catch a future copy-paste bug before we redirect a user
      // to a third-party URL. Run BEFORE the upsert so a guard failure
      // doesn't leave an orphaned pending-OAuth row in Mongo. DCR endpoints
      // do NOT get this check — see `buildAuthorizeUrlFromEndpoints` for
      // the rationale.
      assertSameOrigin(resolved.authorizationEndpoint, resolved.issuer);

      await this.upsertPendingNovuAppConnection({
        enablement,
        subscriberMongoId: subscriber._id,
        command,
        pkceVerifier,
        expectedIssuer: resolved.issuer,
        resource: resolved.resource,
        tokenEndpoint: resolved.tokenEndpoint,
        authorizationEndpoint: resolved.authorizationEndpoint,
        existing,
      });

      const state = await this.buildSignedState(enablement, subscriber._id, agent._id, command);
      const authorizeUrl = this.buildAuthorizeUrlFromEndpoints({
        authorizationEndpoint: resolved.authorizationEndpoint,
        clientId: oauthConfig.credentials.clientId,
        scopes: resolved.scopes,
        resource: resolved.resource,
        state,
        pkceVerifier,
      });

      return { authorizeUrl };
    }

    // DCR mode — existing behaviour.
    const resolved = await this.resolveServerEndpointsForDcr(catalog, command.mcpId);

    const oauthClient = await this.ensureOAuthClient({
      existing,
      asMetadata: resolved.asMetadata,
      oauthConfig: oauthConfig.catalog,
      scopes: resolved.scopes,
    });

    await this.upsertPendingDcrConnection({
      enablement,
      subscriberMongoId: subscriber._id,
      command,
      pkceVerifier,
      expectedIssuer: resolved.asMetadata.issuer,
      resource: resolved.resource,
      oauthClient,
      existing,
    });

    const state = await this.buildSignedState(enablement, subscriber._id, agent._id, command);
    const authorizeUrl = this.buildAuthorizeUrlFromEndpoints({
      authorizationEndpoint: resolved.asMetadata.authorizationEndpoint,
      clientId: oauthClient.clientId,
      scopes: resolved.scopes,
      resource: resolved.resource,
      state,
      pkceVerifier,
    });

    return { authorizeUrl };
  }

  private async loadAuthorizeContext(command: GenerateMcpOAuthUrlCommand): Promise<{
    catalog: McpServer;
    oauthConfig: ResolvedOAuthConfig;
    enablement: AgentMcpServerEntity;
    agent: { _id: string };
    subscriber: { _id: string };
    existing: McpConnectionEntity | null;
  }> {
    const catalog = MCP_SERVERS.find((entry) => entry.id === command.mcpId);

    if (!catalog) {
      throw new BadRequestException(`Unknown MCP "${command.mcpId}".`);
    }

    if (!catalog.oauth) {
      throw new BadRequestException(`MCP "${command.mcpId}" does not have OAuth connectivity configured.`);
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    const enablement = await this.agentMcpServerRepository.findByAgentAndMcpId({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      mcpId: command.mcpId,
    });

    if (!enablement || !enablement.enabled) {
      throw new UnprocessableEntityException(
        `MCP "${command.mcpId}" is not enabled on agent "${command.agentIdentifier}".`
      );
    }

    const oauthConfig = await this.resolveOAuthConfig(catalog, command);

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new NotFoundException(`Subscriber "${command.subscriberId}" not found in this environment.`);
    }

    const existing = await this.mcpConnectionRepository.findSubscriberConnection({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentMcpServerId: enablement._id,
      subscriberId: subscriber._id,
    });

    return { catalog, oauthConfig, enablement, agent, subscriber, existing };
  }

  private async buildAuthorizeUrlForExistingPending(
    context: {
      catalog: McpServer;
      oauthConfig: ResolvedOAuthConfig;
      enablement: AgentMcpServerEntity;
      agent: { _id: string };
      subscriber: { _id: string };
      existing: McpConnectionEntity | null;
    },
    command: GenerateMcpOAuthUrlCommand
  ): Promise<GenerateMcpOAuthUrlResponseDto> {
    const { catalog, oauthConfig, enablement, agent, subscriber, existing } = context;

    if (!existing) {
      throw new BadRequestException('Expected an existing MCP connection row for setup-card OAuth reuse.');
    }

    const pkceVerifier = existing.oauthState?.pkceVerifier;

    if (!pkceVerifier) {
      throw new BadRequestException('Pending OAuth session is missing PKCE verifier; restart the flow.');
    }

    const state = await this.buildSignedState(enablement, subscriber._id, agent._id, command);

    if (oauthConfig.mode === McpConnectionAuthModeEnum.NovuApp) {
      const oauthState = existing.oauthState;
      const authorizationEndpoint = oauthState?.authorizationEndpoint;
      const expectedIssuer = oauthState?.expectedIssuer;
      const resource = oauthState?.resource;

      if (!authorizationEndpoint || !expectedIssuer || !resource) {
        throw new BadRequestException('Pending OAuth session is incomplete; restart the flow.');
      }

      const resolved = await this.resolveServerEndpointsForNovuApp(catalog, oauthConfig);
      // novu-app endpoints are hand-pinned literals, so a same-origin guard
      // catches a copy-paste bug before we redirect the user. DCR endpoints are
      // exempt — see `buildAuthorizeUrlFromEndpoints` for the rationale.
      assertSameOrigin(authorizationEndpoint, expectedIssuer);
      const authorizeUrl = this.buildAuthorizeUrlFromEndpoints({
        authorizationEndpoint,
        clientId: oauthConfig.credentials.clientId,
        scopes: resolved.scopes,
        resource,
        state,
        pkceVerifier,
      });

      return { authorizeUrl };
    }

    if (!existing.oauthClient || !existing.oauthState?.expectedIssuer || !existing.oauthState.resource) {
      throw new BadRequestException('Pending OAuth session is incomplete; restart the flow.');
    }

    const oauthClient = decryptMcpConnectionOAuthClient(existing.oauthClient);
    const authorizeUrl = this.buildAuthorizeUrlFromEndpoints({
      authorizationEndpoint: oauthClient.authorizationEndpoint,
      clientId: oauthClient.clientId,
      scopes: oauthClient.scopesGranted ?? [],
      resource: existing.oauthState.resource,
      state,
      pkceVerifier,
    });

    return { authorizeUrl };
  }

  /**
   * Narrow the catalog entry to a runtime config — DCR catalog as-is, or
   * a NovuApp catalog plus resolved credentials. NovuApp also gates the
   * feature flag here. Callers MUST have already validated `catalog.oauth`
   * exists (see `execute()`); we assert it here as a defence-in-depth check.
   */
  private async resolveOAuthConfig(
    catalog: McpServer,
    command: GenerateMcpOAuthUrlCommand
  ): Promise<ResolvedOAuthConfig> {
    if (!catalog.oauth) {
      throw new BadRequestException(`MCP "${command.mcpId}" does not have OAuth connectivity configured.`);
    }

    const entry: McpOAuthCatalogEntry = catalog.oauth;

    switch (entry.mode) {
      case McpConnectionAuthModeEnum.Dcr:
        return { mode: McpConnectionAuthModeEnum.Dcr, catalog: entry };
      case McpConnectionAuthModeEnum.NovuApp: {
        await assertMcpNovuAppFlagEnabled({
          featureFlagsService: this.featureFlagsService,
          mcpId: command.mcpId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        });

        let credentials: NovuAppCredentials;
        try {
          credentials = this.getNovuAppCredentials.execute(command.mcpId);
        } catch (err) {
          if (err instanceof McpOAuthDiscoveryError) {
            throw new UnprocessableEntityException({
              statusCode: 422,
              message: err.message,
              error: err.code,
            });
          }
          throw err;
        }

        return { mode: McpConnectionAuthModeEnum.NovuApp, catalog: entry, credentials };
      }
      case McpConnectionAuthModeEnum.UserApp:
        throw new BadRequestException(`MCP "${command.mcpId}" auth mode "${entry.mode}" is not yet supported.`);
      default: {
        const _exhaustive: never = entry;

        throw new Error(`Unhandled MCP OAuth mode: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }

  /**
   * Resolve AS endpoints + scope list for a DCR MCP.
   *
   * Runs PRM probe + AS metadata discovery (existing behaviour). Failures
   * bubble up as 422s.
   */
  private async resolveServerEndpointsForDcr(
    catalog: McpServer,
    mcpId: string
  ): Promise<{ asMetadata: AuthorizationServerMetadata; resource: string; scopes: string[] }> {
    const { asMetadata, prm } = await this.resolveAuthorizationServer(catalog.url, mcpId);
    const scopes = this.selectScopes(prm);
    // RFC 8707 §2 — the `resource` indicator MUST be the canonical resource
    // URI advertised by the protected resource. PRM exposes that explicitly;
    // we fall back to the catalog URL only when discovery produced no
    // resource value, otherwise the resource bound into the authorize+token
    // requests would silently disagree with what the authorization server
    // expects.
    const resource = prm.resource ?? catalog.url;

    return { asMetadata, resource, scopes };
  }

  /**
   * Resolve AS endpoints + scope list for a novu-app MCP.
   *
   * PRM probe is BEST EFFORT — the catalog has been hand-vetted (see
   * comment block on MCP_SERVERS) and the AS endpoints + scope list are
   * pinned, so a transient probe failure must not block consent. AS
   * metadata discovery is skipped entirely because non-DCR upstreams
   * (e.g. GitHub) publish neither `.well-known/oauth-authorization-server`
   * nor a registration endpoint.
   */
  private async resolveServerEndpointsForNovuApp(
    catalog: McpServer,
    oauthConfig: Extract<ResolvedOAuthConfig, { mode: McpConnectionAuthModeEnum.NovuApp }>
  ): Promise<{
    issuer: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    resource: string;
    scopes: string[];
  }> {
    let prm: DiscoveredProtectedResource;
    try {
      prm = await this.discoveryService.discoverProtectedResource(catalog.url);
    } catch (err) {
      this.logger.warn(
        { mcpId: catalog.id, mcpUrl: catalog.url, err: err instanceof Error ? err.message : String(err) },
        'PRM probe failed for novu-app MCP; falling back to catalog'
      );
      prm = {
        resource: catalog.url,
        authorizationServers: [oauthConfig.catalog.issuer],
        scopesSupported: [],
        challengeScopes: undefined,
      };
    }

    // Scope selection still respects the PRM challenge / supported scopes
    // when present, so a server that advertises a tighter consent footprint
    // doesn't get overridden by the catalog's superset. Falls back to the
    // catalog's curated list (mirrors Anthropic's connector) otherwise.
    const scopes = this.selectScopes(prm, oauthConfig.catalog.scopes);

    return {
      issuer: oauthConfig.catalog.issuer,
      authorizationEndpoint: oauthConfig.catalog.authorizationEndpoint,
      tokenEndpoint: oauthConfig.catalog.tokenEndpoint,
      resource: prm.resource ?? catalog.url,
      scopes,
    };
  }

  private async resolveAuthorizationServer(
    mcpUrl: string,
    mcpId: string
  ): Promise<{ asMetadata: AuthorizationServerMetadata; prm: DiscoveredProtectedResource }> {
    let prm: DiscoveredProtectedResource;
    try {
      prm = await this.discoveryService.discoverProtectedResource(mcpUrl);
    } catch (err) {
      throw mapDiscoveryError(err, `MCP "${mcpId}"`);
    }

    if (prm.authorizationServers.length === 0) {
      throw new UnprocessableEntityException(
        `MCP "${mcpId}" advertises no authorization servers in Protected Resource Metadata.`
      );
    }

    const [issuer] = prm.authorizationServers;
    let asMetadata: AuthorizationServerMetadata;
    try {
      asMetadata = await this.discoveryService.discoverAuthorizationServer(issuer);
    } catch (err) {
      throw mapDiscoveryError(err, `MCP "${mcpId}" authorization server "${issuer}"`);
    }

    return { asMetadata, prm };
  }

  /**
   * RFC 9728 + MCP-spec Scope Selection Strategy:
   *   1. Use the `scope` parameter from the initial WWW-Authenticate challenge.
   *   2. Otherwise use all of `scopes_supported` from PRM.
   *   3. Otherwise use `fallback` — `[]` for DCR (omit `scope`), the curated
   *      catalog list for novu-app (a missing `scope` would cause the
   *      upstream consent screen to silently downgrade the grant or 400).
   */
  private selectScopes(prm: DiscoveredProtectedResource, fallback: string[] = []): string[] {
    if (prm.challengeScopes && prm.challengeScopes.length > 0) {
      return prm.challengeScopes;
    }
    if (prm.scopesSupported.length > 0) {
      return prm.scopesSupported;
    }

    return fallback;
  }

  private async ensureOAuthClient(args: {
    existing: McpConnectionEntity | null;
    asMetadata: AuthorizationServerMetadata;
    oauthConfig: DcrOAuthCatalogEntry;
    scopes: string[];
  }): Promise<McpConnectionOAuthClient> {
    const { existing, asMetadata, oauthConfig, scopes } = args;
    const redirectUri = buildMcpOAuthRedirectUri();
    const reusable = pickReusableOAuthClient(existing?.oauthClient, asMetadata.issuer, redirectUri);

    if (reusable) {
      return reusable;
    }

    const registration = await this.registerNewClient({ asMetadata, oauthConfig, scopes, redirectUri });

    return {
      clientId: registration.clientId,
      clientSecret: registration.clientSecret,
      clientSecretExpiresAt: registration.clientSecretExpiresAt
        ? secondsSinceEpochToDate(registration.clientSecretExpiresAt)
        : undefined,
      registrationAccessToken: registration.registrationAccessToken,
      registrationClientUri: registration.registrationClientUri,
      issuer: asMetadata.issuer,
      authorizationEndpoint: asMetadata.authorizationEndpoint,
      tokenEndpoint: asMetadata.tokenEndpoint,
      registrationEndpoint: asMetadata.registrationEndpoint,
      scopesGranted: scopes.length > 0 ? scopes : undefined,
      tokenEndpointAuthMethod: registration.tokenEndpointAuthMethod,
      redirectUri,
      registeredAt: new Date(),
    };
  }

  private async registerNewClient(args: {
    asMetadata: AuthorizationServerMetadata;
    oauthConfig: DcrOAuthCatalogEntry;
    scopes: string[];
    redirectUri: string;
  }): Promise<{
    clientId: string;
    clientSecret?: string;
    clientSecretExpiresAt?: number;
    registrationAccessToken?: string;
    registrationClientUri?: string;
    tokenEndpointAuthMethod: SupportedTokenEndpointAuthMethod;
  }> {
    const { asMetadata, oauthConfig, scopes, redirectUri } = args;
    const frontBase = (process.env.DASHBOARD_URL ?? process.env.FRONT_BASE_URL)?.replace(/\/$/, '');
    // Confidential client = we will receive a `client_secret` back. Web apps
    // (`application_type: 'web'`) always run server-side; only `native`
    // installs are eligible for the `none` auth method as a public client.
    const prefersConfidential = (oauthConfig.applicationType ?? 'web') === 'web';
    const tokenEndpointAuthMethod = selectTokenEndpointAuthMethod(
      asMetadata.tokenEndpointAuthMethodsSupported,
      prefersConfidential
    );

    try {
      const registration = await this.discoveryService.registerClient(asMetadata, {
        redirect_uris: [redirectUri],
        client_name: NOVU_MCP_CLIENT_NAME,
        application_type: oauthConfig.applicationType ?? 'web',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: tokenEndpointAuthMethod,
        scope: scopes.length > 0 ? scopes.join(' ') : undefined,
        client_uri: frontBase,
        logo_uri: frontBase ? `${frontBase}/images/novu.svg` : undefined,
        software_id: oauthConfig.softwareId ?? DEFAULT_SOFTWARE_ID,
        software_version: SOFTWARE_VERSION,
      });

      // A secret-bearing method that comes back without a `client_secret`
      // would persist a confidential client we can never authenticate,
      // surfacing later as an opaque `invalid_client` at token exchange.
      // Fail fast so the error points at registration instead.
      if (tokenEndpointAuthMethod !== 'none' && !registration.clientSecret) {
        throw new McpOAuthDiscoveryError(
          'mcp_registration_failed',
          `Dynamic Client Registration returned no client_secret for "${tokenEndpointAuthMethod}".`
        );
      }

      return { ...registration, tokenEndpointAuthMethod };
    } catch (err) {
      throw mapDiscoveryError(err, `MCP authorization server "${asMetadata.issuer}"`);
    }
  }

  private async upsertPendingDcrConnection(args: {
    enablement: AgentMcpServerEntity;
    subscriberMongoId: string;
    command: GenerateMcpOAuthUrlCommand;
    pkceVerifier: string;
    expectedIssuer: string;
    resource: string;
    oauthClient: McpConnectionOAuthClient;
    existing: McpConnectionEntity | null;
  }): Promise<void> {
    const { enablement, subscriberMongoId, command, pkceVerifier, expectedIssuer, resource, oauthClient, existing } =
      args;
    const oauthState: McpConnectionOAuthState = {
      pkceVerifier,
      initiatedAt: new Date(),
      expectedIssuer,
      resource,
    };
    const encryptedClient = encryptMcpConnectionOAuthClient(oauthClient);

    if (existing) {
      await this.mcpConnectionRepository.update(
        {
          _id: existing._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        {
          $set: {
            authMode: McpConnectionAuthModeEnum.Dcr,
            status: McpConnectionStatusEnum.PendingOAuth,
            oauthState,
            oauthClient: encryptedClient,
          },
          $unset: { lastError: 1 },
        }
      );

      return;
    }

    await this.mcpConnectionRepository.create({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      scope: McpConnectionScopeEnum.Subscriber,
      mcpId: command.mcpId,
      _agentMcpServerId: enablement._id,
      _subscriberId: subscriberMongoId,
      authMode: McpConnectionAuthModeEnum.Dcr,
      status: McpConnectionStatusEnum.PendingOAuth,
      oauthState,
      oauthClient: encryptedClient,
    });
  }

  /**
   * `novu-app` upsert: the `oauthClient` field stays absent (no persistent
   * DCR row). Instead `oauthState` carries the AS endpoints so the callback
   * can reconstruct an ephemeral oauthClient + do the token exchange
   * without re-consulting the catalog or env vars at write time.
   *
   * Also clears any stale `oauthClient` left over from a previous DCR-mode
   * connection on the same (subscriber, mcp) — defence in depth, since a
   * mode flip is otherwise possible only by editing the catalog.
   */
  private async upsertPendingNovuAppConnection(args: {
    enablement: AgentMcpServerEntity;
    subscriberMongoId: string;
    command: GenerateMcpOAuthUrlCommand;
    pkceVerifier: string;
    expectedIssuer: string;
    resource: string;
    tokenEndpoint: string;
    authorizationEndpoint: string;
    existing: McpConnectionEntity | null;
  }): Promise<void> {
    const {
      enablement,
      subscriberMongoId,
      command,
      pkceVerifier,
      expectedIssuer,
      resource,
      tokenEndpoint,
      authorizationEndpoint,
      existing,
    } = args;
    const oauthState: McpConnectionOAuthState = {
      pkceVerifier,
      initiatedAt: new Date(),
      expectedIssuer,
      resource,
      tokenEndpoint,
      authorizationEndpoint,
    };

    if (existing) {
      await this.mcpConnectionRepository.update(
        {
          _id: existing._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        {
          $set: {
            authMode: McpConnectionAuthModeEnum.NovuApp,
            status: McpConnectionStatusEnum.PendingOAuth,
            oauthState,
          },
          $unset: { lastError: 1, oauthClient: 1 },
        }
      );

      return;
    }

    await this.mcpConnectionRepository.create({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      scope: McpConnectionScopeEnum.Subscriber,
      mcpId: command.mcpId,
      _agentMcpServerId: enablement._id,
      _subscriberId: subscriberMongoId,
      authMode: McpConnectionAuthModeEnum.NovuApp,
      status: McpConnectionStatusEnum.PendingOAuth,
      oauthState,
    });
  }

  private async buildSignedState(
    enablement: AgentMcpServerEntity,
    subscriberMongoId: string,
    agentId: string,
    command: GenerateMcpOAuthUrlCommand
  ): Promise<string> {
    const stateData: McpOAuthState = {
      agentId,
      agentMcpServerId: enablement._id,
      subscriberId: subscriberMongoId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      mcpId: command.mcpId,
      scope: McpConnectionScopeEnum.Subscriber,
      timestamp: Date.now(),
      ...(command.conversationId ? { conversationId: command.conversationId } : {}),
    };

    const payload = JSON.stringify(stateData);
    const apiKey = await this.getEnvironmentApiKey(command.environmentId);
    const signature = createHash(apiKey, payload);

    if (!signature) {
      throw new BadRequestException('Failed to create OAuth state signature.');
    }

    return encodeOAuthState(payload, signature);
  }

  /**
   * Build the authorize URL from a (clientId, AS endpoints) pair.
   *
   * Same-origin enforcement between the authorize endpoint and the issuer
   * is intentionally NOT performed here. RFC 8414 permits an AS to advertise
   * an `authorization_endpoint` on a sibling origin (e.g. Ahrefs publishes
   * `issuer = https://api.ahrefs.com` but `authorization_endpoint =
   * https://app.ahrefs.com/...`) and rejecting that breaks legitimate
   * providers. For DCR the metadata document is already authenticated
   * against the requested issuer by `isAcceptableIssuerMatch` in the
   * discovery layer, so the provider itself vouches for its endpoints.
   * For `novu-app` mode, where issuer + endpoints are hand-pinned literals
   * in the catalog, the same-origin guard is applied at the call site.
   */
  private buildAuthorizeUrlFromEndpoints(args: {
    authorizationEndpoint: string;
    clientId: string;
    scopes: string[];
    resource: string;
    state: string;
    pkceVerifier: string;
  }): string {
    const { authorizationEndpoint, clientId, scopes, resource, state, pkceVerifier } = args;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: buildMcpOAuthRedirectUri(),
      response_type: 'code',
      state,
      code_challenge: deriveCodeChallenge(pkceVerifier),
      code_challenge_method: 'S256',
      resource,
    });

    if (scopes.length > 0) {
      params.set('scope', scopes.join(' '));
    }

    return `${authorizationEndpoint}?${params.toString()}`;
  }

  private async getEnvironmentApiKey(environmentId: string): Promise<string> {
    const apiKeys = await this.environmentRepository.getApiKeys(environmentId);

    if (!apiKeys.length) {
      throw new NotFoundException(`Environment "${environmentId}" not found.`);
    }

    return apiKeys[0].key;
  }
}

/**
 * Decide whether a `pending_oauth` session can be reused without rotating PKCE.
 * For DCR the recorded client is validated through `pickReusableOAuthClient`
 * (issuer match, unexpired secret, and matching redirect URI); for `novu-app`
 * the pinned endpoints recorded on the session are sufficient.
 */
function canReusePendingOAuthSession(existing: McpConnectionEntity | null): boolean {
  if (!existing) {
    return false;
  }

  if (existing.status !== McpConnectionStatusEnum.PendingOAuth) {
    return false;
  }

  const oauthState = existing.oauthState;

  if (!oauthState?.pkceVerifier || oauthState.callbackClaimedAt) {
    return false;
  }

  if (existing.authMode === McpConnectionAuthModeEnum.NovuApp) {
    return Boolean(
      oauthState.expectedIssuer && oauthState.resource && oauthState.tokenEndpoint && oauthState.authorizationEndpoint
    );
  }

  if (existing.authMode === McpConnectionAuthModeEnum.Dcr) {
    return Boolean(
      oauthState.expectedIssuer &&
        oauthState.resource &&
        pickReusableOAuthClient(existing.oauthClient, oauthState.expectedIssuer, buildMcpOAuthRedirectUri())
    );
  }

  return false;
}

function mapDiscoveryError(err: unknown, contextLabel: string): never {
  if (err instanceof McpOAuthDiscoveryError) {
    throw new UnprocessableEntityException({
      statusCode: 422,
      message: `${contextLabel}: ${err.message}`,
      error: err.code,
    });
  }
  if (err instanceof Error) {
    throw err;
  }
  throw new Error(`${contextLabel}: unknown discovery error`);
}

function secondsSinceEpochToDate(seconds: number): Date | undefined {
  // RFC 7591 §3.2.1: `client_secret_expires_at` of 0 means "never expires".
  if (!seconds || seconds <= 0) {
    return undefined;
  }

  return new Date(seconds * 1000);
}

/**
 * Generate a PKCE `code_verifier` (RFC 7636 §4.1) — 32 bytes of randomness
 * encoded as base64url, yielding 43 chars within the 43-128 length window.
 */
function generatePkceVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

/** Derive the S256 `code_challenge` from a verifier (RFC 7636 §4.2). */
function deriveCodeChallenge(verifier: string): string {
  return base64UrlEncode(nodeCreateHash('sha256').update(verifier).digest());
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Defence in depth for `novu-app` catalog entries ONLY.
 *
 * For hand-pinned upstreams in MCP_SERVERS the `issuer` and
 * `authorizationEndpoint` literals sit next to each other in the same
 * object, so a copy-paste bug (wrong field, wrong tenant) is the most
 * realistic failure mode. Throwing a plain `Error` lets the global filter
 * render a 500 — this is a coding mistake, not a recoverable user error.
 *
 * Do NOT call this for DCR-discovered endpoints: RFC 8414 allows the AS
 * to host its `authorization_endpoint` on a sibling origin (e.g. Ahrefs
 * splits `api.ahrefs.com` issuer from `app.ahrefs.com` authorize) and the
 * discovery layer already validates the metadata document against the
 * requested issuer origin.
 */
function assertSameOrigin(endpoint: string, issuer: string): void {
  let endpointOrigin: string;
  let issuerOrigin: string;
  try {
    endpointOrigin = new URL(endpoint).origin;
    issuerOrigin = new URL(issuer).origin;
  } catch {
    throw new Error(`Invalid authorize endpoint or issuer URL ("${endpoint}", "${issuer}").`);
  }
  if (endpointOrigin !== issuerOrigin) {
    throw new Error(`Authorize endpoint origin "${endpointOrigin}" does not match issuer origin "${issuerOrigin}".`);
  }
}
