import { join } from 'node:path';
import * as SsrfModule from '@novu/application-generic/build/main/utils/ssrf-url-validation';
import { expect } from 'chai';
import sinon from 'sinon';

import { McpOAuthDiscoveryService } from '../../../mcp-oauth-discovery.service';
import { resolveDefaultDcrTokenExchangeOutcome } from '../../resolve-default-dcr-token-exchange-outcome';
import { createDcrFixtureOutboundHandlers, loadDcrFixtureDirectory } from './replay';

function makeLogger() {
  return {
    warn: sinon.stub(),
    error: sinon.stub(),
    debug: sinon.stub(),
    info: sinon.stub(),
    setContext: sinon.stub(),
  };
}

describe('DCR fixture replay harness', () => {
  let safeJsonStub: sinon.SinonStub;
  let safeRawStub: sinon.SinonStub;

  beforeEach(() => {
    safeJsonStub = sinon.stub(SsrfModule, 'safeOutboundJsonRequest');
    safeRawStub = sinon.stub(SsrfModule, 'safeOutboundRequest');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('replays discovery, DCR registration, and token exchange from recorded JSON', async () => {
    const fixtureDir = join(__dirname, '..', 'example');
    const fixture = loadDcrFixtureDirectory(fixtureDir);
    const handlers = createDcrFixtureOutboundHandlers(fixture);
    safeJsonStub.callsFake((args: Parameters<typeof handlers.handleJsonRequest>[0]) =>
      handlers.handleJsonRequest(args)
    );
    safeRawStub.callsFake((args: Parameters<typeof handlers.handleRawRequest>[0]) => handlers.handleRawRequest(args));

    const service = new McpOAuthDiscoveryService(makeLogger() as never);
    const prm = await service.discoverProtectedResource(fixture.manifest.mcpUrl);
    const asMetadata = await service.discoverAuthorizationServer(fixture.manifest.issuer);
    const registration = await service.registerClient(asMetadata, {
      redirect_uris: ['https://api.example.com/v1/agents/mcp/oauth/callback'],
      client_name: 'Novu',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
      scope: 'read write',
    });

    expect(prm.authorizationServers).to.deep.equal(['https://auth.example.com']);
    expect(registration.clientId).to.equal('fixture-client-id');
    expect(registration.tokenEndpointAuthMethod).to.equal('none');

    const tokenOutcome = resolveDefaultDcrTokenExchangeOutcome(200, fixture.tokenExchangeResponse ?? {});

    expect(tokenOutcome.kind).to.equal('success');
    if (tokenOutcome.kind === 'success') {
      expect(tokenOutcome.tokens).to.deep.equal({
        access_token: 'fixture-access-token',
        refresh_token: undefined,
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'read write',
      });
    }
  });
});
