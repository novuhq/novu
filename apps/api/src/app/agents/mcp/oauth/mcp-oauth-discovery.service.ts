import { Injectable } from '@nestjs/common';
import { PinoLogger, SsrfBlockedError, safeOutboundJsonRequest, safeOutboundRequest } from '@novu/application-generic';
import {
  DEFAULT_MCP_TOKEN_ENDPOINT_AUTH_METHOD,
  MCP_TOKEN_ENDPOINT_AUTH_METHODS,
  type McpTokenEndpointAuthMethod,
} from '@novu/shared';
import { LRUCache } from 'lru-cache';
import { isAcceptableIssuerMatch } from './mcp-oauth-issuer-match';

/**
 * Discovery + DCR primitives for the MCP authorization spec
 * (`modelcontextprotocol.io/specification/draft/basic/authorization`).
 *
 * Behaviour:
 *  - `discoverProtectedResource(mcpUrl)` performs an unauthenticated probe
 *    of the MCP server to elicit a `401 Unauthorized` with a
 *    `WWW-Authenticate` header (RFC 9728 §5.1). Falls back to well-known
 *    URI probing per RFC 9728 §5.2 when the header is missing.
 *  - `discoverAuthorizationServer(issuer)` resolves the AS metadata
 *    (RFC 8414) with OIDC Discovery fallback. Validates `issuer` against
 *    the discovery URL and refuses to proceed without `S256` advertised.
 *  - `registerClient(asMetadata, metadata)` runs the RFC 7591 Dynamic
 *    Client Registration `POST {registration_endpoint}`.
 *
 * Caching:
 *  - PRM documents are cached by canonical MCP URL.
 *  - AS metadata documents are cached by issuer.
 *  - Both caches honour the `Cache-Control: max-age=…` header from the
 *    upstream response, clamped to a 5-minute minimum and 1-hour maximum.
 *
 * Errors:
 *  - All failure modes surface as `McpOAuthDiscoveryError` with a typed
 *    `code` so callers can persist it on `mcp_connection.lastError.code`
 *    and the dashboard can render a specific message. The original error
 *    is never embedded in the message because upstream JSON bodies can
 *    contain client secrets returned from a failed `/register` exchange.
 */

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_TTL_MS = 60 * 60 * 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const MAX_CACHE_ENTRIES = 100;

export type McpOAuthErrorCode =
  | 'mcp_no_protected_resource_metadata'
  | 'mcp_no_as_metadata'
  | 'mcp_no_dcr_support'
  | 'mcp_no_pkce_s256'
  | 'mcp_registration_failed'
  | 'mcp_iss_mismatch'
  | 'mcp_token_exchange_failed'
  // ── `novu-app` mode (Novu's pre-registered OAuth app) ────────────────────
  /** `NOVU_*_MCP_APP_CLIENT_ID` / `_SECRET` not set in this environment. */
  | 'mcp_novu_app_credentials_missing'
  /** `IS_MCP_NOVU_APP_ENABLED` LaunchDarkly flag is off for the org. */
  | 'mcp_novu_app_disabled'
  /** GitHub org blocked the Novu App (`application_suspended`, `app_blocked`). */
  | 'mcp_github_org_block'
  /** OAuth standard: the user clicked "Cancel" on the consent screen. */
  | 'mcp_user_denied'
  /** GitHub App: the target org has not approved/installed the Novu App. */
  | 'mcp_app_not_installed';

export class McpOAuthDiscoveryError extends Error {
  readonly code: McpOAuthErrorCode;

  constructor(code: McpOAuthErrorCode, message: string) {
    super(message);
    this.name = 'McpOAuthDiscoveryError';
    this.code = code;
  }
}

/**
 * RFC 9728 Protected Resource Metadata, plus best-effort hints lifted from the
 * initial `WWW-Authenticate` 401 challenge. The challenge fields are kept
 * separate from the canonical PRM fields because the spec's scope-selection
 * strategy gives the challenge scope priority over `scopes_supported`.
 */
export interface DiscoveredProtectedResource {
  /** Canonical resource identifier from PRM (or constructed from the MCP URL). */
  resource: string;
  /** Issuer URLs of one or more authorization servers. */
  authorizationServers: string[];
  /** From PRM `scopes_supported`. Empty when omitted. */
  scopesSupported: string[];
  /**
   * Scope value parsed from the initial `WWW-Authenticate: Bearer scope=…`
   * challenge, when present. The MCP spec gives this priority over
   * `scopes_supported` for the initial authorize request.
   */
  challengeScopes?: string[];
}

/**
 * RFC 8414 / OIDC Discovery 1.0 Authorization Server Metadata, normalized to
 * the fields the MCP-spec flow actually consumes. Unrecognized fields from
 * the upstream document are dropped at parse time — the caller should not
 * rely on round-tripping arbitrary metadata back to the AS.
 */
export interface AuthorizationServerMetadata {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint?: string;
  codeChallengeMethodsSupported: string[];
  scopesSupported?: string[];
  /**
   * RFC 8414 `token_endpoint_auth_methods_supported`. When omitted the spec
   * default is `['client_secret_basic']` — Novu represents that by leaving
   * the field `undefined` so callers can distinguish "AS said nothing" from
   * "AS advertised an explicit empty list". `selectTokenEndpointAuthMethod`
   * handles the defaulting.
   */
  tokenEndpointAuthMethodsSupported?: string[];
  /** RFC 9207 `authorization_response_iss_parameter_supported`. */
  authorizationResponseIssParameterSupported: boolean;
}

/**
 * Re-export of the canonical `token_endpoint_auth_method` union, kept here so
 * existing API-service imports continue to resolve. The source of truth lives
 * in `@novu/shared` because the DAL entity and the runtime providers also
 * need it.
 */
export type { McpTokenEndpointAuthMethod as SupportedTokenEndpointAuthMethod } from '@novu/shared';

/**
 * Priority order Novu uses when an AS advertises multiple methods. Mirrors
 * the RFC 8414 default (`client_secret_basic`) — `client_secret_post` only
 * wins when `basic` is unavailable, and `none` is reserved for public
 * clients with no secret to present.
 */
const TOKEN_ENDPOINT_AUTH_METHOD_PRIORITY: readonly McpTokenEndpointAuthMethod[] = [
  'client_secret_basic',
  'client_secret_post',
  'none',
];

export interface DynamicClientRegistrationRequest {
  redirect_uris: string[];
  client_name: string;
  application_type?: 'web' | 'native';
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
  client_uri?: string;
  logo_uri?: string;
  software_id?: string;
  software_version?: string;
}

export interface DynamicClientRegistrationResponse {
  clientId: string;
  clientSecret?: string;
  /** Seconds since epoch; `0` or absent = non-expiring per RFC 7591 §3.2.1. */
  clientSecretExpiresAt?: number;
  registrationAccessToken?: string;
  registrationClientUri?: string;
  /**
   * Effective `token_endpoint_auth_method` returned by the AS (RFC 7591 §3.2.1).
   * May differ from the value sent in the registration request — e.g. Jotform
   * downgrades confidential registrations to `none`.
   */
  tokenEndpointAuthMethod?: McpTokenEndpointAuthMethod;
}

interface CachedDocument<T> {
  document: T;
  cachedAt: number;
}

@Injectable()
export class McpOAuthDiscoveryService {
  private readonly prmCache = new LRUCache<string, CachedDocument<DiscoveredProtectedResource>>({
    max: MAX_CACHE_ENTRIES,
    ttl: MAX_CACHE_TTL_MS,
  });

  private readonly asMetadataCache = new LRUCache<string, CachedDocument<AuthorizationServerMetadata>>({
    max: MAX_CACHE_ENTRIES,
    ttl: MAX_CACHE_TTL_MS,
  });

  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(McpOAuthDiscoveryService.name);
  }

  async discoverProtectedResource(mcpUrl: string): Promise<DiscoveredProtectedResource> {
    const cached = this.prmCache.get(mcpUrl);
    if (cached) {
      return cached.document;
    }

    let probeHints: { resourceMetadataUrl?: string; challengeScopes?: string[] } = {};
    try {
      probeHints = await this.probeMcpServer(mcpUrl);
    } catch (err) {
      // Probe failure is non-fatal — we still try well-known fallback below.
      // SSRF blocks ARE fatal though: never bypass the policy.
      if (err instanceof SsrfBlockedError) {
        throw new McpOAuthDiscoveryError(
          'mcp_no_protected_resource_metadata',
          `Refusing to discover MCP at "${mcpUrl}": ${err.reason}.`
        );
      }
      this.logger.warn({ mcpUrl, err: serializeError(err) }, 'MCP discovery probe failed; falling back to well-known');
    }

    const prmCandidates = this.buildPrmCandidates(mcpUrl, probeHints.resourceMetadataUrl);
    const prmRaw = await this.fetchFirstAvailable(prmCandidates);

    if (!prmRaw) {
      throw new McpOAuthDiscoveryError(
        'mcp_no_protected_resource_metadata',
        `MCP server at "${mcpUrl}" does not expose Protected Resource Metadata (RFC 9728).`
      );
    }

    const prm = this.parseProtectedResourceMetadata(mcpUrl, prmRaw.body);
    const document: DiscoveredProtectedResource = {
      ...prm,
      challengeScopes: probeHints.challengeScopes,
    };

    this.prmCache.set(mcpUrl, { document, cachedAt: Date.now() }, { ttl: this.parseCacheTtl(prmRaw.cacheControl) });

    return document;
  }

  async discoverAuthorizationServer(issuer: string): Promise<AuthorizationServerMetadata> {
    const cached = this.asMetadataCache.get(issuer);
    if (cached) {
      return cached.document;
    }

    const candidates = this.buildAsMetadataCandidates(issuer);
    const documentRaw = await this.fetchFirstAvailable(candidates);

    if (!documentRaw) {
      throw new McpOAuthDiscoveryError(
        'mcp_no_as_metadata',
        `Authorization server "${issuer}" does not expose OAuth 2.0 / OpenID metadata.`
      );
    }

    const parsed = this.parseAuthorizationServerMetadata(issuer, documentRaw.body);

    if (!parsed.codeChallengeMethodsSupported.includes('S256')) {
      throw new McpOAuthDiscoveryError(
        'mcp_no_pkce_s256',
        `Authorization server "${issuer}" does not advertise PKCE S256 support; refusing to proceed.`
      );
    }

    const ttl = this.parseCacheTtl(documentRaw.cacheControl);
    this.asMetadataCache.set(issuer, { document: parsed, cachedAt: Date.now() }, { ttl });
    // When the document's canonical `issuer` differs from the URL we used
    // to discover it (Auth0-tenant pattern — see `parseAuthorizationServerMetadata`),
    // also cache by the canonical value so callback-time discovery (which
    // re-keys on `expectedIssuer = parsed.issuer`) hits the same entry
    // instead of issuing a fresh request against the origin-only URL.
    if (parsed.issuer !== issuer) {
      this.asMetadataCache.set(parsed.issuer, { document: parsed, cachedAt: Date.now() }, { ttl });
    }

    return parsed;
  }

  async registerClient(
    asMetadata: AuthorizationServerMetadata,
    clientMetadata: DynamicClientRegistrationRequest
  ): Promise<DynamicClientRegistrationResponse> {
    if (!asMetadata.registrationEndpoint) {
      throw new McpOAuthDiscoveryError(
        'mcp_no_dcr_support',
        `Authorization server "${asMetadata.issuer}" does not advertise a registration endpoint; Novu currently requires Dynamic Client Registration.`
      );
    }

    try {
      const response = await safeOutboundJsonRequest<Record<string, unknown>>({
        url: asMetadata.registrationEndpoint,
        method: 'POST',
        body: clientMetadata,
        timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
        headers: { accept: 'application/json' },
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        // Never echo the raw response body — DCR servers occasionally return
        // a `registration_access_token` in the body, which we MUST NOT log.
        const upstreamErrorCode = pickStringField(response.body, 'error') ?? pickStringField(response.body, 'code');
        const upstreamErrorDescription =
          pickStringField(response.body, 'error_description') ?? pickStringField(response.body, 'message');
        this.logger.warn(
          {
            issuer: asMetadata.issuer,
            registrationEndpoint: asMetadata.registrationEndpoint,
            status: response.statusCode,
            upstreamErrorCode,
            upstreamErrorDescription,
          },
          'MCP DCR registration failed'
        );

        throw new McpOAuthDiscoveryError(
          'mcp_registration_failed',
          `Dynamic Client Registration with "${asMetadata.issuer}" failed${upstreamErrorCode ? `: ${upstreamErrorCode}` : '.'}${upstreamErrorDescription ? ` — ${upstreamErrorDescription}` : ''}`
        );
      }

      const body = response.body;
      const clientId = pickStringField(body, 'client_id');
      if (!clientId) {
        throw new McpOAuthDiscoveryError(
          'mcp_registration_failed',
          `Dynamic Client Registration at "${asMetadata.issuer}" returned no client_id.`
        );
      }

      return {
        clientId,
        clientSecret: pickStringField(body, 'client_secret') ?? undefined,
        clientSecretExpiresAt: pickNumberField(body, 'client_secret_expires_at') ?? undefined,
        registrationAccessToken: pickStringField(body, 'registration_access_token') ?? undefined,
        registrationClientUri: pickStringField(body, 'registration_client_uri') ?? undefined,
        tokenEndpointAuthMethod: parseTokenEndpointAuthMethod(body),
      };
    } catch (err) {
      if (err instanceof McpOAuthDiscoveryError) {
        throw err;
      }
      if (err instanceof SsrfBlockedError) {
        throw new McpOAuthDiscoveryError(
          'mcp_registration_failed',
          `Refusing to register with "${asMetadata.issuer}": ${err.reason}.`
        );
      }
      this.logger.warn({ issuer: asMetadata.issuer, err: serializeError(err) }, 'MCP DCR registration request failed');

      throw new McpOAuthDiscoveryError(
        'mcp_registration_failed',
        `Dynamic Client Registration with "${asMetadata.issuer}" failed.`
      );
    }
  }

  /** Test-only escape hatch: drop cached entries for a (mcpUrl|issuer) pair. */
  clearCache(opts?: { mcpUrl?: string; issuer?: string }): void {
    if (!opts) {
      this.prmCache.clear();
      this.asMetadataCache.clear();

      return;
    }
    if (opts.mcpUrl) {
      this.prmCache.delete(opts.mcpUrl);
    }
    if (opts.issuer) {
      // `discoverAuthorizationServer` dual-keys the metadata under both the
      // discovery URL and the document's canonical `issuer` (Auth0-tenant
      // pattern). Evicting only the requested key would leave the canonical
      // entry stale, so drop both when they diverge.
      const entry = this.asMetadataCache.get(opts.issuer);
      this.asMetadataCache.delete(opts.issuer);
      if (entry && entry.document.issuer !== opts.issuer) {
        this.asMetadataCache.delete(entry.document.issuer);
      }
    }
  }

  private async probeMcpServer(mcpUrl: string): Promise<{ resourceMetadataUrl?: string; challengeScopes?: string[] }> {
    let response: Awaited<ReturnType<typeof safeOutboundRequest>>;
    try {
      response = await safeOutboundRequest({
        url: mcpUrl,
        method: 'GET',
        timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
        headers: { accept: 'application/json, text/event-stream, */*' },
        maxResponseBytes: 64 * 1024,
      });
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw err;
      }
      // Treat any other failure as "no usable probe info"; well-known fallback
      // will take over.
      return {};
    }

    if (response.statusCode !== 401) {
      return {};
    }

    // A single `WWW-Authenticate` response can carry multiple challenges (RFC
    // 7235 §4.1) — e.g. `Basic realm="…", Bearer resource_metadata="…"`. Some
    // servers also emit the header more than once. `headerValue()` collapses
    // either shape to just the first entry, which would drop the Bearer
    // hint whenever it isn't first. Join everything into one string so the
    // Bearer-aware parser can locate it regardless of ordering.
    const wwwAuth = joinHeaderValues(response.headers['www-authenticate']);

    return parseWwwAuthenticateHeader(wwwAuth);
  }

  private buildPrmCandidates(mcpUrl: string, hint?: string): string[] {
    const candidates: string[] = [];
    if (hint) {
      candidates.push(hint);
    }

    let parsed: URL;
    try {
      parsed = new URL(mcpUrl);
    } catch {
      return candidates;
    }

    const path = parsed.pathname.replace(/\/+$/, '');
    if (path && path !== '') {
      const subPath = `${parsed.origin}/.well-known/oauth-protected-resource${path}`;
      candidates.push(subPath);
    }
    candidates.push(`${parsed.origin}/.well-known/oauth-protected-resource`);

    return dedupe(candidates);
  }

  private buildAsMetadataCandidates(issuer: string): string[] {
    const candidates: string[] = [];
    let parsed: URL;
    try {
      parsed = new URL(issuer);
    } catch {
      return candidates;
    }

    const path = parsed.pathname.replace(/\/+$/, '');
    if (path && path !== '') {
      candidates.push(`${parsed.origin}/.well-known/oauth-authorization-server${path}`);
      candidates.push(`${parsed.origin}/.well-known/openid-configuration${path}`);
      candidates.push(`${parsed.origin}${path}/.well-known/openid-configuration`);
    } else {
      candidates.push(`${parsed.origin}/.well-known/oauth-authorization-server`);
      candidates.push(`${parsed.origin}/.well-known/openid-configuration`);
    }

    return dedupe(candidates);
  }

  private async fetchFirstAvailable(
    urls: string[]
  ): Promise<{ body: Record<string, unknown>; cacheControl?: string } | null> {
    for (const url of urls) {
      try {
        const response = await safeOutboundJsonRequest<Record<string, unknown>>({
          url,
          method: 'GET',
          timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
          headers: { accept: 'application/json' },
        });

        if (response.statusCode >= 200 && response.statusCode < 300 && isPlainObject(response.body)) {
          return {
            body: response.body,
            cacheControl: headerValue(response.headers['cache-control']),
          };
        }
      } catch (err) {
        if (err instanceof SsrfBlockedError) {
          throw err;
        }
        this.logger.debug({ url, err: serializeError(err) }, 'Well-known fetch attempt failed');
      }
    }

    return null;
  }

  private parseProtectedResourceMetadata(
    mcpUrl: string,
    body: Record<string, unknown>
  ): Omit<DiscoveredProtectedResource, 'challengeScopes'> {
    let authorizationServers = pickStringArrayField(body, 'authorization_servers');

    // Some providers (e.g. Netlify MCP) serve RFC 8414 AS metadata at the PRM
    // well-known URL instead of RFC 9728 PRM. When the document advertises OAuth
    // endpoints and an issuer but omits authorization_servers, treat the issuer
    // as the sole authorization server for this resource.
    if (!authorizationServers || authorizationServers.length === 0) {
      const issuer = pickStringField(body, 'issuer');
      const authorizationEndpoint = pickStringField(body, 'authorization_endpoint');
      const tokenEndpoint = pickStringField(body, 'token_endpoint');

      if (issuer && authorizationEndpoint && tokenEndpoint) {
        authorizationServers = [issuer];
      }
    }

    if (!authorizationServers || authorizationServers.length === 0) {
      throw new McpOAuthDiscoveryError(
        'mcp_no_protected_resource_metadata',
        `Protected Resource Metadata for "${mcpUrl}" is missing authorization_servers.`
      );
    }

    const resource = pickStringField(body, 'resource') ?? mcpUrl;

    return {
      resource,
      authorizationServers,
      scopesSupported: pickStringArrayField(body, 'scopes_supported') ?? [],
    };
  }

  private parseAuthorizationServerMetadata(issuer: string, body: Record<string, unknown>): AuthorizationServerMetadata {
    const docIssuer = pickStringField(body, 'issuer');
    const authorizationEndpoint = pickStringField(body, 'authorization_endpoint');
    const tokenEndpoint = pickStringField(body, 'token_endpoint');
    const registrationEndpoint = pickStringField(body, 'registration_endpoint') ?? undefined;
    const issuerMatch = docIssuer
      ? isAcceptableIssuerMatch(issuer, docIssuer, {
          authorizationEndpoint,
          tokenEndpoint,
          registrationEndpoint,
        })
      : false;
    if (!docIssuer || !issuerMatch) {
      // Per RFC 8414 §3.3 the `issuer` value in the document MUST equal the
      // identifier used to construct the well-known URL. Narrow relaxations
      // (Auth0 tenant suffix, delegated issuers, MCP gateways) live in
      // `mcp-oauth-issuer-match.ts`.
      throw new McpOAuthDiscoveryError(
        'mcp_no_as_metadata',
        `Authorization server metadata issuer mismatch (expected "${issuer}", got "${docIssuer ?? 'absent'}").`
      );
    }

    if (!authorizationEndpoint || !tokenEndpoint) {
      throw new McpOAuthDiscoveryError(
        'mcp_no_as_metadata',
        `Authorization server metadata for "${issuer}" is missing authorize/token endpoints.`
      );
    }

    return {
      issuer: docIssuer,
      authorizationEndpoint,
      tokenEndpoint,
      registrationEndpoint,
      codeChallengeMethodsSupported: pickStringArrayField(body, 'code_challenge_methods_supported') ?? [],
      scopesSupported: pickStringArrayField(body, 'scopes_supported') ?? undefined,
      tokenEndpointAuthMethodsSupported:
        pickStringArrayField(body, 'token_endpoint_auth_methods_supported') ?? undefined,
      authorizationResponseIssParameterSupported: Boolean(body.authorization_response_iss_parameter_supported),
    };
  }

  private parseCacheTtl(cacheControl: string | undefined): number {
    if (!cacheControl) {
      return DEFAULT_CACHE_TTL_MS;
    }
    const match = cacheControl.match(/max-age\s*=\s*(\d+)/i);
    if (!match) {
      return DEFAULT_CACHE_TTL_MS;
    }
    const seconds = Number(match[1]);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return DEFAULT_CACHE_TTL_MS;
    }
    const ms = seconds * 1000;

    return Math.min(Math.max(ms, DEFAULT_CACHE_TTL_MS), MAX_CACHE_TTL_MS);
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;

  return Array.isArray(value) ? value[0] : value;
}

/**
 * Join multiple header values (or multiple comma-separated challenges in a
 * single value) into one string suitable for re-parsing. Preserves quoted
 * commas inside `key="value, with comma"` by not splitting the input; the
 * downstream parser handles the comma-separation itself.
 */
function joinHeaderValues(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string' && v.length > 0).join(', ');
  }

  return value;
}

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTokenEndpointAuthMethod(body: unknown): McpTokenEndpointAuthMethod | undefined {
  const value = pickStringField(body, 'token_endpoint_auth_method');

  if (!value) {
    return undefined;
  }

  if ((MCP_TOKEN_ENDPOINT_AUTH_METHODS as readonly string[]).includes(value)) {
    return value as McpTokenEndpointAuthMethod;
  }

  return undefined;
}

function pickStringField(body: unknown, key: string): string | undefined {
  if (!isPlainObject(body)) return undefined;
  const value = body[key];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function pickNumberField(body: unknown, key: string): number | undefined {
  if (!isPlainObject(body)) return undefined;
  const value = body[key];

  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function pickStringArrayField(body: unknown, key: string): string[] | undefined {
  if (!isPlainObject(body)) return undefined;
  const value = body[key];
  if (!Array.isArray(value)) return undefined;
  const filtered = value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);

  return filtered.length > 0 ? filtered : undefined;
}

function serializeError(err: unknown): { name: string; message: string } | string {
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }

  return String(err);
}

/**
 * Negotiate the `token_endpoint_auth_method` to register with via DCR (and
 * to replay verbatim at token-exchange / refresh time).
 *
 * Inputs:
 *  - `advertised` — the AS's `token_endpoint_auth_methods_supported` list, or
 *    `undefined` when the document omits the field. RFC 8414 §2 defines the
 *    default as `client_secret_basic`, so an absent list is treated as if it
 *    contained only `client_secret_basic`.
 *  - `prefersConfidential` — whether Novu will hold a `client_secret` for
 *    this registration. The priority loop skips `none` when confidential;
 *    if the AS advertises only `none`, the fallback returns that method so
 *    public-only upstreams (e.g. Jotform) can register — `GenerateMcpOAuthUrl`
 *    handles missing `client_secret` via RFC 7591 §3.2.1 downgrade.
 *
 * Returns the first method from `TOKEN_ENDPOINT_AUTH_METHOD_PRIORITY` that
 * intersects the advertised list, else the first recognised advertised
 * method, else `client_secret_basic` (RFC 8414 §2 default).
 */
export function selectTokenEndpointAuthMethod(
  advertised: string[] | undefined,
  prefersConfidential: boolean
): McpTokenEndpointAuthMethod {
  const supported = advertised && advertised.length > 0 ? advertised : [DEFAULT_MCP_TOKEN_ENDPOINT_AUTH_METHOD];
  const supportedSet = new Set(supported);

  for (const method of TOKEN_ENDPOINT_AUTH_METHOD_PRIORITY) {
    if (!supportedSet.has(method)) continue;
    if (method === 'none' && prefersConfidential) continue;

    return method;
  }

  const firstRecognised = supported.find((method): method is McpTokenEndpointAuthMethod =>
    (MCP_TOKEN_ENDPOINT_AUTH_METHODS as readonly string[]).includes(method)
  );

  if (firstRecognised) {
    return firstRecognised;
  }

  return DEFAULT_MCP_TOKEN_ENDPOINT_AUTH_METHOD;
}

/**
 * Ordered list of `token_endpoint_auth_method` values to attempt at DCR time.
 * Starts with the negotiated primary (see `selectTokenEndpointAuthMethod`),
 * then walks the remaining advertised methods in Novu priority order so we
 * can recover when an AS advertises a method in metadata but rejects it at
 * registration (e.g. Supermetrics lists `client_secret_basic` in RFC 8414
 * metadata but only accepts `client_secret_post` at `/oauth/register`).
 */
export function buildTokenEndpointAuthMethodsToTry(
  advertised: string[] | undefined,
  prefersConfidential: boolean
): McpTokenEndpointAuthMethod[] {
  const primary = selectTokenEndpointAuthMethod(advertised, prefersConfidential);
  const supported = advertised && advertised.length > 0 ? advertised : [DEFAULT_MCP_TOKEN_ENDPOINT_AUTH_METHOD];
  const supportedSet = new Set(supported);
  const fallbacks = TOKEN_ENDPOINT_AUTH_METHOD_PRIORITY.filter(
    (method) => method !== primary && supportedSet.has(method) && !(method === 'none' && prefersConfidential)
  );

  return [primary, ...fallbacks];
}

export function isUnsupportedTokenEndpointAuthMethodError(err: unknown): boolean {
  if (!(err instanceof McpOAuthDiscoveryError)) {
    return false;
  }

  if (err.code !== 'mcp_registration_failed') {
    return false;
  }

  return /unsupported token endpoint auth method/i.test(err.message);
}

/**
 * RFC 9728 §5.1 / RFC 6750 §3.1 — extract the `Bearer` challenge from a
 * `WWW-Authenticate` header and return the pieces relevant to MCP
 * authorization (`resource_metadata` PRM hint + advertised scopes).
 *
 * Handles multi-challenge headers like
 *   `Basic realm="x", Bearer resource_metadata="…", scope="a b"`
 * by isolating just the `Bearer` segment instead of requiring the header to
 * start with `Bearer`. Other auth schemes are ignored.
 */
export function parseWwwAuthenticateHeader(header: string | undefined): {
  resourceMetadataUrl?: string;
  challengeScopes?: string[];
} {
  if (!header) return {};
  const bearerParams = extractBearerChallengeParams(header);
  if (bearerParams === null) return {};

  const result: { resourceMetadataUrl?: string; challengeScopes?: string[] } = {};
  const re = /(\w+)\s*=\s*("([^"]*)"|([^,]+))(?:\s*,\s*|\s*$)/g;
  for (const match of bearerParams.matchAll(re)) {
    const key = match[1].toLowerCase();
    const value = (match[3] ?? match[4] ?? '').trim();
    if (!value) continue;
    if (key === 'resource_metadata') {
      result.resourceMetadataUrl = value;
    } else if (key === 'scope') {
      const scopes = value.split(/\s+/).filter(Boolean);
      if (scopes.length > 0) {
        result.challengeScopes = scopes;
      }
    }
  }

  return result;
}

/**
 * Locate the `Bearer` challenge within a (possibly multi-challenge) header
 * and return its raw `key=value, key=value` parameter string. Returns
 * `null` when no `Bearer` challenge is present.
 *
 * The match relies on `Bearer` being followed by whitespace (auth-param
 * region) or appearing at end of input. Subsequent schemes are detected by a
 * comma followed by an `Atom` token followed by whitespace, which is how
 * RFC 7235 §4.1 separates challenges.
 */
function extractBearerChallengeParams(header: string): string | null {
  const trimmed = header.trim();
  if (!trimmed) return null;

  const startMatch = /(^|,)\s*bearer(\s+|$)/i.exec(trimmed);
  if (!startMatch) return null;

  const paramsStart = startMatch.index + startMatch[0].length;
  if (paramsStart >= trimmed.length) return '';

  // Walk forward until we hit the next scheme boundary, respecting quoted
  // values that may contain commas / whitespace.
  let inQuotes = false;
  let i = paramsStart;
  for (; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (ch === '"' && trimmed[i - 1] !== '\\') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === ',') {
      // A comma starts another auth-param if followed by `token=`; it starts
      // another challenge if followed by `token<sp>`. Peek ahead.
      const rest = trimmed.slice(i + 1);
      const nextScheme = /^\s*[!#$%&'*+\-.^_`|~\w]+(\s+|$)/.exec(rest);
      if (nextScheme && !/^\s*[!#$%&'*+\-.^_`|~\w]+\s*=/.exec(rest)) {
        break;
      }
    }
  }

  return trimmed.slice(paramsStart, i).trim();
}
