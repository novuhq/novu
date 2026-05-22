import * as SsrfModule from '@novu/application-generic/build/main/utils/ssrf-url-validation';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  McpOAuthDiscoveryError,
  McpOAuthDiscoveryService,
  parseWwwAuthenticateHeader,
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
        })
      );

      const result = await service.registerClient(AS_METADATA, CLIENT_METADATA);
      expect(result.clientId).to.equal('abc123');
      expect(result.clientSecret).to.equal('s3cret');
      expect(result.clientSecretExpiresAt).to.equal(0);
      expect(result.registrationAccessToken).to.equal('rat');
      expect(result.registrationClientUri).to.equal('https://auth.example.com/register/abc123');

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
  });
});
