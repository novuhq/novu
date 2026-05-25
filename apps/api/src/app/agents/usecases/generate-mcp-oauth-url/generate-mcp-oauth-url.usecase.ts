import { createHash as nodeCreateHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  NotImplementedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  createHash,
  decryptMcpConnectionOAuthClient,
  encodeOAuthState,
  encryptMcpConnectionOAuthClient,
} from '@novu/application-generic';
import {
  AgentMcpServerEntity,
  AgentMcpServerRepository,
  AgentRepository,
  EnvironmentRepository,
  McpConnectionEntity,
  McpConnectionOAuthClient,
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
} from '@novu/shared';
import { GenerateMcpOAuthUrlResponseDto } from '../../dtos/mcp-server.dto';
import {
  AuthorizationServerMetadata,
  DiscoveredProtectedResource,
  McpOAuthDiscoveryError,
  McpOAuthDiscoveryService,
} from '../../services/mcp-oauth-discovery.service';
import { GenerateMcpOAuthUrlCommand } from './generate-mcp-oauth-url.command';
import { buildMcpOAuthRedirectUri, type McpOAuthState } from './mcp-oauth-state';

const NOVU_MCP_CLIENT_NAME = 'Novu';
const DEFAULT_SOFTWARE_ID = 'novu-mcp-client';
const SOFTWARE_VERSION = process.env.NOVU_API_VERSION || 'dev';

/**
 * Build the provider authorize URL for a `subscriber`-scoped MCP
 * OAuth flow that follows the MCP authorization spec
 * (`modelcontextprotocol.io/specification/draft/basic/authorization`).
 *
 * Sequence:
 *  1. Discover PRM (RFC 9728) for the catalog MCP URL.
 *  2. Discover AS metadata (RFC 8414 / OIDC) for the chosen authorization
 *     server. Refuses to proceed unless `S256` is advertised.
 *  3. Reuse the per-subscriber DCR client from the existing mcp_connection
 *     row when issuer + secret-expiry still match; otherwise POST
 *     `{registration_endpoint}` (RFC 7591) and persist the new credentials.
 *  4. Generate a PKCE S256 challenge, record the expected issuer + canonical
 *     resource on `oauthState`, sign the redirect state with the env API key.
 *  5. Return the authorize URL with `client_id`, `redirect_uri`,
 *     `response_type=code`, `scope` (per spec scope-selection strategy),
 *     `state`, `code_challenge`, `code_challenge_method=S256`, and
 *     `resource` (RFC 8707).
 */
@Injectable()
export class GenerateMcpOAuthUrl {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly discoveryService: McpOAuthDiscoveryService
  ) {}

  async execute(command: GenerateMcpOAuthUrlCommand): Promise<GenerateMcpOAuthUrlResponseDto> {
    const catalog = MCP_SERVERS.find((entry) => entry.id === command.mcpId);

    if (!catalog) {
      throw new BadRequestException(`Unknown MCP "${command.mcpId}".`);
    }

    const oauthConfig = requireDcrCatalogEntry(catalog, command.mcpId);

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

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new NotFoundException(`Subscriber "${command.subscriberId}" not found in this environment.`);
    }

    const { asMetadata, prm } = await this.resolveAuthorizationServer(catalog.url, command.mcpId);
    const scopes = this.selectScopes(prm);
    // RFC 8707 §2 — the `resource` indicator MUST be the canonical resource
    // URI advertised by the protected resource. PRM exposes that explicitly
    // (`prm.resource`); we fall back to the catalog URL only when discovery
    // produced no resource value, otherwise the resource bound into the
    // authorize+token requests would silently disagree with what the
    // authorization server expects.
    const resource = prm.resource ?? catalog.url;

    const existing = await this.mcpConnectionRepository.findSubscriberConnection({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentMcpServerId: enablement._id,
      subscriberId: subscriber._id,
    });

    const oauthClient = await this.ensureOAuthClient({
      existing,
      asMetadata,
      oauthConfig,
      scopes,
    });

    const pkceVerifier = generatePkceVerifier();

    await this.upsertPendingConnection({
      enablement,
      subscriberMongoId: subscriber._id,
      command,
      pkceVerifier,
      expectedIssuer: asMetadata.issuer,
      resource,
      oauthClient,
      existing,
    });

    const state = await this.buildSignedState(enablement, subscriber._id, agent._id, command);
    const authorizeUrl = this.buildAuthorizeUrl({
      asMetadata,
      oauthClient,
      scopes,
      resource,
      state,
      pkceVerifier,
    });

    return { authorizeUrl };
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

  private selectScopes(prm: DiscoveredProtectedResource): string[] {
    // RFC 9728 + MCP-spec Scope Selection Strategy:
    //   1. Use the `scope` parameter from the initial WWW-Authenticate challenge.
    //   2. Otherwise use all of `scopes_supported` from PRM.
    //   3. Otherwise omit `scope` (return []).
    if (prm.challengeScopes && prm.challengeScopes.length > 0) {
      return prm.challengeScopes;
    }
    if (prm.scopesSupported.length > 0) {
      return prm.scopesSupported;
    }

    return [];
  }

  private async ensureOAuthClient(args: {
    existing: McpConnectionEntity | null;
    asMetadata: AuthorizationServerMetadata;
    oauthConfig: DcrOAuthCatalogEntry;
    scopes: string[];
  }): Promise<McpConnectionOAuthClient> {
    const { existing, asMetadata, oauthConfig, scopes } = args;
    const reusable = pickReusableOAuthClient(existing?.oauthClient, asMetadata.issuer);

    if (reusable) {
      return reusable;
    }

    const registration = await this.registerNewClient({ asMetadata, oauthConfig, scopes });

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
      registeredAt: new Date(),
    };
  }

  private async registerNewClient(args: {
    asMetadata: AuthorizationServerMetadata;
    oauthConfig: DcrOAuthCatalogEntry;
    scopes: string[];
  }): Promise<{
    clientId: string;
    clientSecret?: string;
    clientSecretExpiresAt?: number;
    registrationAccessToken?: string;
    registrationClientUri?: string;
  }> {
    const { asMetadata, oauthConfig, scopes } = args;
    const frontBase = (process.env.DASHBOARD_URL ?? process.env.FRONT_BASE_URL)?.replace(/\/$/, '');

    try {
      return await this.discoveryService.registerClient(asMetadata, {
        redirect_uris: [buildMcpOAuthRedirectUri()],
        client_name: NOVU_MCP_CLIENT_NAME,
        application_type: oauthConfig.applicationType ?? 'web',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_post',
        scope: scopes.length > 0 ? scopes.join(' ') : undefined,
        client_uri: frontBase,
        logo_uri: frontBase ? `${frontBase}/static/novu-logo.png` : undefined,
        software_id: oauthConfig.softwareId ?? DEFAULT_SOFTWARE_ID,
        software_version: SOFTWARE_VERSION,
      });
    } catch (err) {
      throw mapDiscoveryError(err, `MCP authorization server "${asMetadata.issuer}"`);
    }
  }

  private async upsertPendingConnection(args: {
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
    const oauthState = {
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
    };

    const payload = JSON.stringify(stateData);
    const apiKey = await this.getEnvironmentApiKey(command.environmentId);
    const signature = createHash(apiKey, payload);

    if (!signature) {
      throw new BadRequestException('Failed to create OAuth state signature.');
    }

    return encodeOAuthState(payload, signature);
  }

  private buildAuthorizeUrl(args: {
    asMetadata: AuthorizationServerMetadata;
    oauthClient: McpConnectionOAuthClient;
    scopes: string[];
    resource: string;
    state: string;
    pkceVerifier: string;
  }): string {
    const { asMetadata, oauthClient, scopes, resource, state, pkceVerifier } = args;
    const params = new URLSearchParams({
      client_id: oauthClient.clientId,
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

    return `${asMetadata.authorizationEndpoint}?${params.toString()}`;
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
 * Decide whether to reuse the row's existing DCR-issued client. Returns the
 * decrypted client when:
 *  - the row has an `oauthClient`,
 *  - the recorded `issuer` matches the AS metadata `issuer` (no rotation), and
 *  - `clientSecretExpiresAt` is in the future (or absent, meaning non-expiring).
 *
 * Otherwise returns `undefined` and the caller re-registers.
 *
 * NOTE: `McpConnectionOAuthClient.clientSecretExpiresAt` is declared as `Date`
 * on the entity type, but `BaseRepositoryV2.mapProjectedEntity` runs the row
 * through `convertObjectIds` (see `libs/dal/src/repositories/projection.types.ts`)
 * which serialises every `Date` instance to an ISO string. So at runtime this
 * field is a string when loaded from Mongo, and only a `Date` immediately
 * after construction in-process. We accept both shapes — `new Date(value)`
 * happily takes either.
 */
function pickReusableOAuthClient(
  client: McpConnectionOAuthClient | undefined,
  asIssuer: string
): McpConnectionOAuthClient | undefined {
  if (!client) return undefined;
  if (client.issuer !== asIssuer) return undefined;
  if (client.clientSecretExpiresAt) {
    const expiresMs = new Date(client.clientSecretExpiresAt as unknown as string | Date).getTime();
    if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
      return undefined;
    }
  }

  return decryptMcpConnectionOAuthClient(client);
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
 * Narrow a catalog entry to the DCR variant or surface a clear error. The
 * catalog locks each MCP to one OAuth mechanism; missing `oauth` is a 400
 * (the MCP isn't connectable yet) while `novu-app` and `user-app` land here
 * as `NotImplementedException` until the resolver service ships.
 */
function requireDcrCatalogEntry(catalog: McpServer, mcpId: string): DcrOAuthCatalogEntry {
  if (!catalog.oauth) {
    throw new BadRequestException(`MCP "${mcpId}" does not have OAuth connectivity configured.`);
  }

  const entry: McpOAuthCatalogEntry = catalog.oauth;

  switch (entry.mode) {
    case McpConnectionAuthModeEnum.Dcr:
      return entry;
    case McpConnectionAuthModeEnum.NovuApp:
    case McpConnectionAuthModeEnum.UserApp:
      throw new NotImplementedException(`MCP "${mcpId}" auth mode "${entry.mode}" is not yet supported.`);
    default: {
      const _exhaustive: never = entry;

      throw new Error(`Unhandled MCP OAuth mode: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
