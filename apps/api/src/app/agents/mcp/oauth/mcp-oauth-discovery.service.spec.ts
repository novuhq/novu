import * as SsrfModule from '@novu/application-generic/build/main/utils/ssrf-url-validation';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  buildTokenEndpointAuthMethodsToTry,
  isUnsupportedTokenEndpointAuthMethodError,
  McpOAuthDiscoveryError,
  McpOAuthDiscoveryService,
  parseWwwAuthenticateHeader,
  selectTokenEndpointAuthMethod,
} from './mcp-oauth-discovery.service';

type SafeJsonResponse<T> = {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[] | undefined>;
  body: T;
};

type SafeRawResponse = {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

function jsonResponse<T>(statusCode: number, body: T, headers: Record<string, string> = {}): SafeJsonResponse<T> {
  return { statusCode, statusMessage: 'OK', headers, body };
}

function rawResponse(statusCode: number, headers: Record<string, string> = {}): SafeRawResponse {
  return { statusCode, statusMessage: '', headers, body: Buffer.alloc(0) };
}

function makeLogger() {
  return {
    warn: sinon.stub(),
    error: sinon.stub(),
    debug: sinon.stub(),
    info: sinon.stub(),
    setContext: sinon.stub(),
  };
}

describe('McpOAuthDiscoveryService', () => {
  let safeJsonStub: sinon.SinonStub;
  let safeRawStub: sinon.SinonStub;
  let service: McpOAuthDiscoveryService;

  beforeEach(() => {
    safeJsonStub = sinon.stub(SsrfModule, 'safeOutboundJsonRequest');
    safeRawStub = sinon.stub(SsrfModule, 'safeOutboundRequest');
    service = new McpOAuthDiscoveryService(makeLogger() as never);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('parseWwwAuthenticateHeader', () => {
    it('extracts resource_metadata and scope from a Bearer challenge', () => {
      const header =
        'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource", scope="read write"';
      const result = parseWwwAuthenticateHeader(header);

      expect(result.resourceMetadataUrl).to.equal('https://mcp.example.com/.well-known/oauth-protected-resource');
      expect(result.challengeScopes).to.deep.equal(['read', 'write']);
    });

    it('returns empty object for non-Bearer schemes', () => {
      expect(parseWwwAuthenticateHeader('Basic realm="example"')).to.deep.equal({});
      expect(parseWwwAuthenticateHeader(undefined)).to.deep.equal({});
      expect(parseWwwAuthenticateHeader('')).to.deep.equal({});
    });

    it('accepts unquoted values', () => {
      const result = parseWwwAuthenticateHeader('Bearer resource_metadata=https://x/y, scope=a');
      expect(result.resourceMetadataUrl).to.equal('https://x/y');
      expect(result.challengeScopes).to.deep.equal(['a']);
    });

    it('finds the Bearer challenge when another scheme is listed first', () => {
      const result = parseWwwAuthenticateHeader(
        'Basic realm="x", Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource", scope="read"'
      );
      expect(result.resourceMetadataUrl).to.equal('https://mcp.example.com/.well-known/oauth-protected-resource');
      expect(result.challengeScopes).to.deep.equal(['read']);
    });
  });

  describe('selectTokenEndpointAuthMethod', () => {
    it('prefers client_secret_basic when the AS advertises both basic and post', () => {
      expect(selectTokenEndpointAuthMethod(['client_secret_post', 'client_secret_basic'], true)).to.equal(
        'client_secret_basic'
      );
    });

    it('falls back to client_secret_post when basic is not advertised', () => {
      expect(selectTokenEndpointAuthMethod(['client_secret_post'], true)).to.equal('client_secret_post');
    });

    it('returns the Airtable-style intersection (basic + none) as client_secret_basic for a confidential client', () => {
      expect(selectTokenEndpointAuthMethod(['client_secret_basic', 'none'], true)).to.equal('client_secret_basic');
    });

    it('selects none when the AS advertises only none', () => {
      expect(selectTokenEndpointAuthMethod(['none'], false)).to.equal('none');
      expect(selectTokenEndpointAuthMethod(['none'], true)).to.equal('none');
    });

    it('defaults to client_secret_basic when the AS omits the field (RFC 8414 §2 default)', () => {
      expect(selectTokenEndpointAuthMethod(undefined, true)).to.equal('client_secret_basic');
      expect(selectTokenEndpointAuthMethod([], true)).to.equal('client_secret_basic');
    });

    it('falls back to client_secret_basic when none of the advertised methods are supported', () => {
      expect(selectTokenEndpointAuthMethod(['private_key_jwt', 'tls_client_auth'], true)).to.equal(
        'client_secret_basic'
      );
    });
  });

  describe('buildTokenEndpointAuthMethodsToTry', () => {
    it('orders fallbacks after the negotiated primary for Supermetrics-style metadata', () => {
      expect(
        buildTokenEndpointAuthMethodsToTry(['client_secret_post', 'client_secret_basic', 'none'], true)
      ).to.deep.equal(['client_secret_basic', 'client_secret_post']);
    });

    it('returns only the primary when no other advertised methods remain', () => {
      expect(buildTokenEndpointAuthMethodsToTry(['client_secret_post'], true)).to.deep.equal(['client_secret_post']);
    });
  });

  describe('isUnsupportedTokenEndpointAuthMethodError', () => {
    it('detects DCR rejections for unsupported token endpoint auth methods', () => {
      const err = new McpOAuthDiscoveryError(
        'mcp_registration_failed',
        'Dynamic Client Registration with "https://api.supermetrics.com" failed: invalid_client_metadata — Unsupported token endpoint auth method: "client_secret_basic". Supported methods: none, client_secret_post'
      );

      expect(isUnsupportedTokenEndpointAuthMethodError(err)).to.equal(true);
    });

    it('detects unsupported auth method errors regardless of message casing', () => {
      const err = new McpOAuthDiscoveryError(
        'mcp_registration_failed',
        'Dynamic Client Registration failed: unsupported TOKEN ENDPOINT AUTH METHOD: "client_secret_basic"'
      );

      expect(isUnsupportedTokenEndpointAuthMethodError(err)).to.equal(true);
    });

    it('returns false for unrelated registration failures', () => {
      const err = new McpOAuthDiscoveryError(
        'mcp_registration_failed',
        'Dynamic Client Registration with "https://auth.example.com" failed: invalid_redirect_uri'
      );

      expect(isUnsupportedTokenEndpointAuthMethodError(err)).to.equal(false);
    });
  });

  describe('discoverProtectedResource', () => {
    const PRM_BODY = {
      resource: 'https://mcp.example.com',
      authorization_servers: ['https://auth.example.com'],
      scopes_supported: ['read'],
    };

    it('uses WWW-Authenticate resource_metadata URL when present and parses challenge scopes', async () => {
      safeRawStub.resolves(
        rawResponse(401, {
          'www-authenticate':
            'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource", scope="files:read"',
        })
      );
      safeJsonStub.resolves(jsonResponse(200, PRM_BODY));

      const prm = await service.discoverProtectedResource('https://mcp.example.com/mcp');

      expect(prm.authorizationServers).to.deep.equal(['https://auth.example.com']);
      expect(prm.scopesSupported).to.deep.equal(['read']);
      expect(prm.challengeScopes).to.deep.equal(['files:read']);
      expect(safeJsonStub.calledOnce).to.equal(true);
      expect(safeJsonStub.firstCall.args[0].url).to.equal(
        'https://mcp.example.com/.well-known/oauth-protected-resource'
      );
    });

    it('falls back to the path-specific then root well-known URI when probe returns no header', async () => {
      safeRawStub.resolves(rawResponse(401, {}));
      // First attempt: path-specific 404
      safeJsonStub.onCall(0).resolves(jsonResponse(404, {}));
      // Second attempt: root succeeds
      safeJsonStub.onCall(1).resolves(jsonResponse(200, PRM_BODY));

      const prm = await service.discoverProtectedResource('https://mcp.example.com/mcp');

      expect(prm.authorizationServers).to.deep.equal(['https://auth.example.com']);
      expect(safeJsonStub.firstCall.args[0].url).to.equal(
        'https://mcp.example.com/.well-known/oauth-protected-resource/mcp'
      );
      expect(safeJsonStub.secondCall.args[0].url).to.equal(
        'https://mcp.example.com/.well-known/oauth-protected-resource'
      );
    });

    it('throws a typed mcp_no_protected_resource_metadata error when nothing resolves', async () => {
      safeRawStub.resolves(rawResponse(401, {}));
      safeJsonStub.resolves(jsonResponse(404, {}));

      try {
        await service.discoverProtectedResource('https://mcp.example.com/mcp');
        throw new Error('expected discoverProtectedResource to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
        expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_no_protected_resource_metadata');
      }
    });

    it('caches the resolved PRM keyed by MCP URL', async () => {
      safeRawStub.resolves(rawResponse(401, {}));
      safeJsonStub.resolves(jsonResponse(200, PRM_BODY));

      await service.discoverProtectedResource('https://mcp.example.com/mcp');
      await service.discoverProtectedResource('https://mcp.example.com/mcp');

      expect(safeJsonStub.callCount).to.equal(1);
    });

    it('rejects PRM documents missing authorization_servers', async () => {
      safeRawStub.resolves(rawResponse(401, {}));
      safeJsonStub.resolves(jsonResponse(200, { resource: 'https://mcp.example.com' }));

      try {
        await service.discoverProtectedResource('https://mcp.example.com/mcp');
        throw new Error('expected discoverProtectedResource to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
        expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_no_protected_resource_metadata');
      }
    });

    it('accepts co-located AS metadata served at the PRM well-known URL', async () => {
      safeRawStub.resolves(rawResponse(405, {}));
      safeJsonStub.resolves(
        jsonResponse(200, {
          resource: 'https://netlify-mcp.netlify.app/mcp',
          issuer: 'https://netlify-mcp.netlify.app/',
          authorization_endpoint: 'https://netlify-mcp.netlify.app/oauth-server/auth',
          token_endpoint: 'https://netlify-mcp.netlify.app/oauth-server/token',
          registration_endpoint: 'https://netlify-mcp.netlify.app/oauth-server/reg',
          scopes_supported: ['openid', 'read', 'write'],
        })
      );

      const prm = await service.discoverProtectedResource('https://netlify-mcp.netlify.app/mcp');

      expect(prm.resource).to.equal('https://netlify-mcp.netlify.app/mcp');
      expect(prm.authorizationServers).to.deep.equal(['https://netlify-mcp.netlify.app/']);
      expect(prm.scopesSupported).to.deep.equal(['openid', 'read', 'write']);
    });
  });

  describe('discoverAuthorizationServer', () => {
    const AS_BODY_BASE = {
      authorization_endpoint: 'https://auth.example.com/authorize',
      token_endpoint: 'https://auth.example.com/token',
      registration_endpoint: 'https://auth.example.com/register',
      code_challenge_methods_supported: ['S256'],
      authorization_response_iss_parameter_supported: true,
    };

    it('parses a complete AS metadata document and caches it by issuer', async () => {
      safeJsonStub.resolves(jsonResponse(200, { ...AS_BODY_BASE, issuer: 'https://auth.example.com' }));

      const md = await service.discoverAuthorizationServer('https://auth.example.com');

      expect(md.issuer).to.equal('https://auth.example.com');
      expect(md.authorizationEndpoint).to.equal('https://auth.example.com/authorize');
      expect(md.tokenEndpoint).to.equal('https://auth.example.com/token');
      expect(md.registrationEndpoint).to.equal('https://auth.example.com/register');
      expect(md.codeChallengeMethodsSupported).to.deep.equal(['S256']);
      expect(md.authorizationResponseIssParameterSupported).to.equal(true);

      // Second call — cache hit
      await service.discoverAuthorizationServer('https://auth.example.com');
      expect(safeJsonStub.callCount).to.equal(1);
    });

    it('parses token_endpoint_auth_methods_supported when advertised', async () => {
      safeJsonStub.resolves(
        jsonResponse(200, {
          ...AS_BODY_BASE,
          issuer: 'https://auth.example.com',
          token_endpoint_auth_methods_supported: ['client_secret_basic', 'none'],
        })
      );

      const md = await service.discoverAuthorizationServer('https://auth.example.com');
      expect(md.tokenEndpointAuthMethodsSupported).to.deep.equal(['client_secret_basic', 'none']);
    });

    it('leaves tokenEndpointAuthMethodsSupported undefined when the AS omits the field', async () => {
      safeJsonStub.resolves(jsonResponse(200, { ...AS_BODY_BASE, issuer: 'https://auth.example.com' }));

      const md = await service.discoverAuthorizationServer('https://auth.example.com');
      expect(md.tokenEndpointAuthMethodsSupported).to.equal(undefined);
    });

    it('accepts the Clerk delegated-issuer pattern where PRM lists the product origin', async () => {
      safeJsonStub.resolves(
        jsonResponse(200, {
          issuer: 'https://clerk.context7.com',
          authorization_endpoint: 'https://context7.com/api/oauth/authorize',
          token_endpoint: 'https://context7.com/api/oauth/token',
          registration_endpoint: 'https://context7.com/api/oauth/register',
          code_challenge_methods_supported: ['S256'],
          token_endpoint_auth_methods_supported: ['client_secret_post'],
          authorization_response_iss_parameter_supported: false,
        })
      );

      const md = await service.discoverAuthorizationServer('https://context7.com');

      expect(md.issuer).to.equal('https://clerk.context7.com');
      expect(md.registrationEndpoint).to.equal('https://context7.com/api/oauth/register');
    });

    it('accepts the parent-domain issuer pattern where PRM lists a product subdomain', async () => {
      safeJsonStub.resolves(
        jsonResponse(200, {
          issuer: 'https://vercel.com',
          authorization_endpoint: 'https://vercel.com/oauth/authorize',
          token_endpoint: 'https://vercel.com/api/login/oauth/token',
          registration_endpoint: 'https://vercel.com/api/login/oauth/register',
          code_challenge_methods_supported: ['S256'],
          token_endpoint_auth_methods_supported: ['none'],
          authorization_response_iss_parameter_supported: false,
        })
      );

      const md = await service.discoverAuthorizationServer('https://mcp.vercel.com');

      expect(md.issuer).to.equal('https://vercel.com');
      expect(md.registrationEndpoint).to.equal('https://vercel.com/api/login/oauth/register');
    });

    it('accepts the MCP well-known gateway pattern (PlanetScale)', async () => {
      safeJsonStub.resolves(
        jsonResponse(200, {
          issuer: 'https://api.planetscale.com',
          authorization_endpoint: 'https://app.planetscale.com/oauth/authorize',
          token_endpoint: 'https://auth.planetscale.com/oauth/token',
          registration_endpoint: 'https://auth.planetscale.com/oauth/registration',
          code_challenge_methods_supported: ['S256'],
          token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
          authorization_response_iss_parameter_supported: false,
        })
      );

      const md = await service.discoverAuthorizationServer('https://mcp.pscale.dev/mcp/planetscale');

      expect(md.issuer).to.equal('https://api.planetscale.com');
      expect(md.registrationEndpoint).to.equal('https://auth.planetscale.com/oauth/registration');
    });

    it('accepts the sibling-subdomain MCP gateway pattern (New Relic)', async () => {
      safeJsonStub.resolves(
        jsonResponse(200, {
          issuer: 'https://login.newrelic.com',
          authorization_endpoint: 'https://login.newrelic.com/login',
          token_endpoint: 'https://mcp.newrelic.com/oauth2/token',
          registration_endpoint: 'https://mcp.newrelic.com/register',
          code_challenge_methods_supported: ['S256'],
          token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
          authorization_response_iss_parameter_supported: false,
        })
      );

      const md = await service.discoverAuthorizationServer('https://mcp.newrelic.com');

      expect(md.issuer).to.equal('https://login.newrelic.com');
      expect(md.authorizationEndpoint).to.equal('https://login.newrelic.com/login');
      expect(md.tokenEndpoint).to.equal('https://mcp.newrelic.com/oauth2/token');
      expect(md.registrationEndpoint).to.equal('https://mcp.newrelic.com/register');
    });

    it('rejects the MCP well-known gateway pattern when OAuth endpoints leave the advertised domain', async () => {
      safeJsonStub.resolves(
        jsonResponse(200, {
          issuer: 'https://api.planetscale.com',
          authorization_endpoint: 'https://app.planetscale.com/oauth/authorize',
          token_endpoint: 'https://evil.example/oauth/token',
          registration_endpoint: 'https://auth.planetscale.com/oauth/registration',
          code_challenge_methods_supported: ['S256'],
        })
      );

      try {
        await service.discoverAuthorizationServer('https://mcp.pscale.dev/mcp/planetscale');
        throw new Error('expected discoverAuthorizationServer to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
        expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_no_as_metadata');
      }
    });

    it('accepts AS metadata when PRM lists the issuer with a trailing slash (Monte Carlo)', async () => {
      safeJsonStub.resolves(
        jsonResponse(200, {
          issuer: 'https://auth.getmontecarlo.com',
          authorization_endpoint: 'https://auth.getmontecarlo.com/oauth2/authorize',
          token_endpoint: 'https://auth.getmontecarlo.com/oauth2/token',
          registration_endpoint: 'https://auth.getmontecarlo.com/oauth2/register',
          code_challenge_methods_supported: ['S256'],
          token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
        })
      );

      const md = await service.discoverAuthorizationServer('https://auth.getmontecarlo.com/');

      expect(md.issuer).to.equal('https://auth.getmontecarlo.com');
      expect(md.registrationEndpoint).to.equal('https://auth.getmontecarlo.com/oauth2/register');
    });

    it('rejects metadata when issuer does not match the discovery URL', async () => {
      safeJsonStub.resolves(jsonResponse(200, { ...AS_BODY_BASE, issuer: 'https://attacker.example' }));

      try {
        await service.discoverAuthorizationServer('https://auth.example.com');
        throw new Error('expected discoverAuthorizationServer to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
        expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_no_as_metadata');
      }
    });

    it('throws mcp_no_pkce_s256 when S256 is not advertised', async () => {
      safeJsonStub.resolves(
        jsonResponse(200, {
          ...AS_BODY_BASE,
          issuer: 'https://auth.example.com',
          code_challenge_methods_supported: ['plain'],
        })
      );

      try {
        await service.discoverAuthorizationServer('https://auth.example.com');
        throw new Error('expected discoverAuthorizationServer to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
        expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_no_pkce_s256');
      }
    });

    it('throws mcp_no_pkce_s256 when code_challenge_methods_supported is absent (spec required)', async () => {
      safeJsonStub.resolves(
        jsonResponse(200, {
          authorization_endpoint: AS_BODY_BASE.authorization_endpoint,
          token_endpoint: AS_BODY_BASE.token_endpoint,
          issuer: 'https://auth.example.com',
        })
      );

      try {
        await service.discoverAuthorizationServer('https://auth.example.com');
        throw new Error('expected discoverAuthorizationServer to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
        expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_no_pkce_s256');
      }
    });

    it('accepts the Auth0-tenant pattern where the document advertises only the origin as issuer', async () => {
      // Atlassian Rovo and other Auth0-backed upstreams serve per-tenant AS
      // metadata under `/.well-known/oauth-authorization-server/<tenant>`
      // but the document declares only the base origin as its `issuer`.
      // We accept this narrow relaxation (same origin, no path swap).
      safeJsonStub.resolves(jsonResponse(200, { ...AS_BODY_BASE, issuer: 'https://auth.example.com' }));

      const tenantIssuer = 'https://auth.example.com/tenant-abc';
      const md = await service.discoverAuthorizationServer(tenantIssuer);

      expect(md.issuer).to.equal('https://auth.example.com');

      // Both the tenant-pathed URL AND the document's canonical issuer must
      // hit the cache, so callback-time discovery (which re-keys on the
      // canonical issuer) doesn't burn an outbound timeout.
      await service.discoverAuthorizationServer(tenantIssuer);
      await service.discoverAuthorizationServer('https://auth.example.com');
      expect(safeJsonStub.callCount).to.equal(1);
    });

    it('rejects metadata when the advertised issuer adds a different path on the same origin', async () => {
      // Path swap on the same origin would let one tenant impersonate another.
      safeJsonStub.resolves(jsonResponse(200, { ...AS_BODY_BASE, issuer: 'https://auth.example.com/other-tenant' }));

      try {
        await service.discoverAuthorizationServer('https://auth.example.com/tenant-abc');
        throw new Error('expected discoverAuthorizationServer to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
        expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_no_as_metadata');
      }
    });

    it('falls back to OpenID configuration endpoint when oauth-authorization-server fails', async () => {
      safeJsonStub.onCall(0).resolves(jsonResponse(404, {}));
      safeJsonStub.onCall(1).resolves(jsonResponse(200, { ...AS_BODY_BASE, issuer: 'https://auth.example.com' }));

      const md = await service.discoverAuthorizationServer('https://auth.example.com');
      expect(md.issuer).to.equal('https://auth.example.com');
      expect(safeJsonStub.firstCall.args[0].url).to.equal(
        'https://auth.example.com/.well-known/oauth-authorization-server'
      );
      expect(safeJsonStub.secondCall.args[0].url).to.equal('https://auth.example.com/.well-known/openid-configuration');
    });
  });

  describe('registerClient', () => {
    const AS_METADATA = {
      issuer: 'https://auth.example.com',
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
      registrationEndpoint: 'https://auth.example.com/register',
      codeChallengeMethodsSupported: ['S256'],
      authorizationResponseIssParameterSupported: true,
    };

    const CLIENT_METADATA = {
      redirect_uris: ['https://novu.example/v1/agents/mcp/oauth/callback'],
      client_name: 'Novu',
    };

    it('POSTs to the registration endpoint and normalizes the response', async () => {
      safeJsonStub.resolves(
        jsonResponse(201, {
          client_id: 'abc123',
          client_secret: 's3cret',
          client_secret_expires_at: 0,
          registration_access_token: 'rat',
          registration_client_uri: 'https://auth.example.com/register/abc123',
          token_endpoint_auth_method: 'client_secret_post',
        })
      );

      const result = await service.registerClient(AS_METADATA, CLIENT_METADATA);
      expect(result.clientId).to.equal('abc123');
      expect(result.clientSecret).to.equal('s3cret');
      expect(result.clientSecretExpiresAt).to.equal(0);
      expect(result.registrationAccessToken).to.equal('rat');
      expect(result.registrationClientUri).to.equal('https://auth.example.com/register/abc123');
      expect(result.tokenEndpointAuthMethod).to.equal('client_secret_post');

      const call = safeJsonStub.firstCall.args[0];
      expect(call.url).to.equal('https://auth.example.com/register');
      expect(call.method).to.equal('POST');
      expect(call.body).to.deep.equal(CLIENT_METADATA);
    });

    it('throws mcp_no_dcr_support when AS metadata lacks a registration_endpoint', async () => {
      try {
        await service.registerClient({ ...AS_METADATA, registrationEndpoint: undefined }, CLIENT_METADATA);
        throw new Error('expected registerClient to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
        expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_no_dcr_support');
      }
    });

    it('throws mcp_registration_failed when the AS rejects the registration', async () => {
      safeJsonStub.resolves(jsonResponse(400, { error: 'invalid_redirect_uri' }));

      try {
        await service.registerClient(AS_METADATA, CLIENT_METADATA);
        throw new Error('expected registerClient to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
        expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_registration_failed');
        expect((err as Error).message).to.include('invalid_redirect_uri');
      }
    });

    it('throws mcp_registration_failed when the response omits client_id', async () => {
      safeJsonStub.resolves(jsonResponse(201, { client_secret: 's3cret' }));

      try {
        await service.registerClient(AS_METADATA, CLIENT_METADATA);
        throw new Error('expected registerClient to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
        expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_registration_failed');
      }
    });

    it('surfaces token_endpoint_auth_method when the AS downgrades to a public client', async () => {
      safeJsonStub.resolves(
        jsonResponse(200, {
          client_id: 'public-client',
          token_endpoint_auth_method: 'none',
        })
      );

      const result = await service.registerClient(AS_METADATA, {
        ...CLIENT_METADATA,
        token_endpoint_auth_method: 'client_secret_post',
      });

      expect(result.clientId).to.equal('public-client');
      expect(result.clientSecret).to.equal(undefined);
      expect(result.tokenEndpointAuthMethod).to.equal('none');
    });
  });

  describe('clearCache', () => {
    it('drops cached entries on demand', async () => {
      const prmBody = {
        resource: 'https://mcp.example.com',
        authorization_servers: ['https://auth.example.com'],
      };
      safeRawStub.resolves(rawResponse(401, {}));
      safeJsonStub.resolves(jsonResponse(200, prmBody));

      await service.discoverProtectedResource('https://mcp.example.com/mcp');
      service.clearCache({ mcpUrl: 'https://mcp.example.com/mcp' });
      await service.discoverProtectedResource('https://mcp.example.com/mcp');

      expect(safeJsonStub.callCount).to.equal(2);
    });

    it('evicts the canonical issuer entry when clearing a tenant-pathed issuer', async () => {
      // Auth0-tenant pattern: discovery dual-keys the metadata under both the
      // tenant-pathed URL and the document's canonical origin issuer. Clearing
      // by the tenant-pathed key must also drop the canonical entry, otherwise
      // a later canonical-keyed lookup hits the stale cache.
      const asBody = {
        authorization_endpoint: 'https://auth.example.com/authorize',
        token_endpoint: 'https://auth.example.com/token',
        registration_endpoint: 'https://auth.example.com/register',
        code_challenge_methods_supported: ['S256'],
        authorization_response_iss_parameter_supported: true,
      };
      safeJsonStub.resolves(jsonResponse(200, { ...asBody, issuer: 'https://auth.example.com' }));

      const tenantIssuer = 'https://auth.example.com/tenant-abc';
      await service.discoverAuthorizationServer(tenantIssuer);
      expect(safeJsonStub.callCount).to.equal(1);

      service.clearCache({ issuer: tenantIssuer });

      await service.discoverAuthorizationServer('https://auth.example.com');
      expect(safeJsonStub.callCount).to.equal(2);
    });
  });
});
