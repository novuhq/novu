import {
  decryptChannelConnectionAuth,
  encryptChannelConnectionAuth,
  encryptChannelEndpoint,
  type WebexTokenRefreshResponse,
} from '@novu/application-generic';
import { type ChannelEndpointByType, ChannelTypeEnum, ChatProviderIdEnum, ToolProviderIdEnum } from '@novu/shared';
import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect } from 'chai';
import sinon from 'sinon';
import { ResolveChannelEndpoints } from './resolve-channel-endpoints.usecase';

const ORGANIZATION_ID = 'org_123';
const ENVIRONMENT_ID = 'env_123';
const SUBSCRIBER_ID = 'subscriber_123';
const INTEGRATION_IDENTIFIER = 'webex-integration';
const CONNECTION_IDENTIFIER = 'webex-connection';
const NOW = new Date('2026-06-01T00:00:00.000Z').getTime();

describe('ResolveChannelEndpoints - Webex Messaging', () => {
  let sandbox: sinon.SinonSandbox;
  let channelEndpointRepository: Record<string, sinon.SinonStub>;
  let channelConnectionRepository: Record<string, sinon.SinonStub>;
  let integrationRepository: Record<string, sinon.SinonStub>;
  let webexTokenService: Record<string, sinon.SinonStub>;
  let usecase: ResolveChannelEndpoints;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.useFakeTimers(NOW);

    channelEndpointRepository = {
      find: sandbox.stub(),
      buildContextExactMatchQuery: sandbox.stub().returns({}),
    };
    channelConnectionRepository = {
      find: sandbox.stub(),
      findOneAndUpdate: sandbox.stub().resolves(undefined),
      buildContextExactMatchQuery: sandbox.stub().returns({}),
    };
    integrationRepository = {
      findOne: sandbox.stub(),
    };
    webexTokenService = {
      refreshAccessToken: sandbox.stub(),
    };

    usecase = new ResolveChannelEndpoints(
      channelEndpointRepository as any,
      channelConnectionRepository as any,
      integrationRepository as any,
      { getBotFrameworkToken: sandbox.stub() } as any,
      webexTokenService as any
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('resolves Webex endpoint data with the current channel connection access token', async () => {
    channelEndpointRepository.find.resolves([
      buildWebexEndpoint({
        identifier: 'webex-room-endpoint',
        endpoint: { roomId: 'room_123' },
        type: ENDPOINT_TYPES.WEBEX_ROOM,
      }),
    ]);
    channelConnectionRepository.find.resolves([
      buildWebexConnection({
        accessToken: 'current-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(NOW + 60 * 60 * 1000).toISOString(),
      }),
    ]);

    const result = await usecase.execute(buildCommand());

    expect(result).to.deep.equal([
      {
        integrationIdentifier: INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.WebexMessaging,
        channelData: [
          {
            type: ENDPOINT_TYPES.WEBEX_ROOM,
            identifier: 'webex-room-endpoint',
            endpoint: { roomId: 'room_123' },
            token: 'current-token',
          },
        ],
      },
    ]);
    sinon.assert.notCalled(webexTokenService.refreshAccessToken);
    expect(channelConnectionRepository.find.firstCall.args[0].identifier).to.deep.equal({
      $in: [CONNECTION_IDENTIFIER],
    });
  });

  it('refreshes an expiring Webex connection once for all endpoints and persists encrypted auth', async () => {
    channelEndpointRepository.find.resolves([
      buildWebexEndpoint({
        identifier: 'webex-room-endpoint',
        endpoint: { roomId: 'room_123' },
        type: ENDPOINT_TYPES.WEBEX_ROOM,
      }),
      buildWebexEndpoint({
        identifier: 'webex-person-endpoint',
        endpoint: { personId: 'person_123' },
        type: ENDPOINT_TYPES.WEBEX_PERSON,
      }),
    ]);
    channelConnectionRepository.find.resolves([
      buildWebexConnection({
        accessToken: 'stale-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(NOW + 60 * 1000).toISOString(),
        refreshTokenExpiresAt: new Date(NOW + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    ]);
    integrationRepository.findOne.resolves({
      credentials: {
        clientId: 'webex-client-id',
        secretKey: 'webex-client-secret',
      },
    });
    webexTokenService.refreshAccessToken.resolves({
      access_token: 'fresh-token',
      refresh_token: 'fresh-refresh-token',
      expires_in: 3600,
      refresh_token_expires_in: 7200,
    } satisfies WebexTokenRefreshResponse);

    const result = await usecase.execute(buildCommand());

    expect(result[0].channelData).to.deep.equal([
      {
        type: ENDPOINT_TYPES.WEBEX_ROOM,
        identifier: 'webex-room-endpoint',
        endpoint: { roomId: 'room_123' },
        token: 'fresh-token',
      },
      {
        type: ENDPOINT_TYPES.WEBEX_PERSON,
        identifier: 'webex-person-endpoint',
        endpoint: { personId: 'person_123' },
        token: 'fresh-token',
      },
    ]);
    sinon.assert.calledOnceWithExactly(
      webexTokenService.refreshAccessToken,
      'refresh-token',
      'webex-client-id',
      'webex-client-secret'
    );
    sinon.assert.calledOnce(channelConnectionRepository.findOneAndUpdate);

    const [updateFilter, updatePayload] = channelConnectionRepository.findOneAndUpdate.firstCall.args;
    expect(updateFilter).to.deep.equal({
      _environmentId: ENVIRONMENT_ID,
      _organizationId: ORGANIZATION_ID,
      identifier: CONNECTION_IDENTIFIER,
    });

    const encryptedAuth = updatePayload.$set.auth;
    expect(encryptedAuth.accessToken).to.not.equal('fresh-token');

    const refreshedAuth = decryptChannelConnectionAuth(encryptedAuth);
    expect(refreshedAuth.accessToken).to.equal('fresh-token');
    expect(refreshedAuth.refreshToken).to.equal('fresh-refresh-token');
    expect(refreshedAuth.expiresAt).to.equal(new Date(NOW + 3600 * 1000).toISOString());
    expect(refreshedAuth.refreshTokenExpiresAt).to.equal(new Date(NOW + 7200 * 1000).toISOString());
  });
});

describe('ResolveChannelEndpoints - PagerDuty', () => {
  let sandbox: sinon.SinonSandbox;
  let channelEndpointRepository: Record<string, sinon.SinonStub>;
  let channelConnectionRepository: Record<string, sinon.SinonStub>;
  let usecase: ResolveChannelEndpoints;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    channelEndpointRepository = {
      find: sandbox.stub(),
      buildContextExactMatchQuery: sandbox.stub().returns({}),
    };
    channelConnectionRepository = {
      find: sandbox.stub(),
      buildContextExactMatchQuery: sandbox.stub().returns({}),
    };

    usecase = new ResolveChannelEndpoints(
      channelEndpointRepository as any,
      channelConnectionRepository as any,
      { findOne: sandbox.stub() } as any,
      { getBotFrameworkToken: sandbox.stub() } as any,
      { refreshAccessToken: sandbox.stub() } as any
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('decrypts routingKey from endpoint.endpoint and returns channelData without a connection', async () => {
    channelEndpointRepository.find.resolves([
      buildPagerDutyEndpoint({
        endpoint: encryptChannelEndpoint(ENDPOINT_TYPES.PAGERDUTY_SERVICE, {
          routingKey: 'R0UTINGK3YEXAMPLE000000000000000',
          region: 'eu',
        }),
      }),
    ]);

    const result = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL }));

    expect(result).to.deep.equal([
      {
        integrationIdentifier: PAGERDUTY_INTEGRATION_IDENTIFIER,
        providerId: ToolProviderIdEnum.PagerDuty,
        channelData: [
          {
            type: ENDPOINT_TYPES.PAGERDUTY_SERVICE,
            identifier: 'pagerduty-endpoint',
            endpoint: { routingKey: 'R0UTINGK3YEXAMPLE000000000000000', region: 'eu' },
          },
        ],
      },
    ]);
    sinon.assert.notCalled(channelConnectionRepository.find);
  });

  it('throws when routingKey or region is missing after decrypt', async () => {
    channelEndpointRepository.find.resolves([
      buildPagerDutyEndpoint({
        endpoint: encryptChannelEndpoint(ENDPOINT_TYPES.PAGERDUTY_SERVICE, {
          routingKey: 'R0UTINGK3YEXAMPLE000000000000000',
        } as ChannelEndpointByType[typeof ENDPOINT_TYPES.PAGERDUTY_SERVICE]),
      }),
    ]);

    const error = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL })).catch((e) => e);

    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.contain('pagerduty-endpoint');
    expect(error.message).to.contain('missing routingKey or region');
  });
});

describe('ResolveChannelEndpoints - Opsgenie', () => {
  let sandbox: sinon.SinonSandbox;
  let channelEndpointRepository: Record<string, sinon.SinonStub>;
  let channelConnectionRepository: Record<string, sinon.SinonStub>;
  let usecase: ResolveChannelEndpoints;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    channelEndpointRepository = {
      find: sandbox.stub(),
      buildContextExactMatchQuery: sandbox.stub().returns({}),
    };
    channelConnectionRepository = {
      find: sandbox.stub(),
      buildContextExactMatchQuery: sandbox.stub().returns({}),
    };

    usecase = new ResolveChannelEndpoints(
      channelEndpointRepository as any,
      channelConnectionRepository as any,
      { findOne: sandbox.stub() } as any,
      { getBotFrameworkToken: sandbox.stub() } as any,
      { refreshAccessToken: sandbox.stub() } as any
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('decrypts apiKey from endpoint.endpoint and returns channelData without a connection', async () => {
    channelEndpointRepository.find.resolves([
      buildOpsgenieEndpoint({
        endpoint: encryptChannelEndpoint(ENDPOINT_TYPES.OPSGENIE_INTEGRATION, {
          apiKey: 'genie-key-123',
          region: 'eu',
        }),
      }),
    ]);

    const result = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL }));

    expect(result).to.deep.equal([
      {
        integrationIdentifier: OPSGENIE_INTEGRATION_IDENTIFIER,
        providerId: ToolProviderIdEnum.Opsgenie,
        channelData: [
          {
            type: ENDPOINT_TYPES.OPSGENIE_INTEGRATION,
            identifier: 'opsgenie-endpoint',
            endpoint: { apiKey: 'genie-key-123', region: 'eu' },
          },
        ],
      },
    ]);
    sinon.assert.notCalled(channelConnectionRepository.find);
  });

  it('throws when apiKey or region is missing after decrypt', async () => {
    channelEndpointRepository.find.resolves([
      buildOpsgenieEndpoint({
        endpoint: encryptChannelEndpoint(ENDPOINT_TYPES.OPSGENIE_INTEGRATION, {
          apiKey: 'genie-key-123',
        } as ChannelEndpointByType[typeof ENDPOINT_TYPES.OPSGENIE_INTEGRATION]),
      }),
    ]);

    const error = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL })).catch((e) => e);

    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.contain('opsgenie-endpoint');
    expect(error.message).to.contain('missing apiKey or region');
  });
});

describe('ResolveChannelEndpoints - Grafana', () => {
  let sandbox: sinon.SinonSandbox;
  let channelEndpointRepository: Record<string, sinon.SinonStub>;
  let channelConnectionRepository: Record<string, sinon.SinonStub>;
  let usecase: ResolveChannelEndpoints;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    channelEndpointRepository = {
      find: sandbox.stub(),
      buildContextExactMatchQuery: sandbox.stub().returns({}),
    };
    channelConnectionRepository = {
      find: sandbox.stub(),
      buildContextExactMatchQuery: sandbox.stub().returns({}),
    };

    usecase = new ResolveChannelEndpoints(
      channelEndpointRepository as any,
      channelConnectionRepository as any,
      { findOne: sandbox.stub() } as any,
      { getBotFrameworkToken: sandbox.stub() } as any,
      { refreshAccessToken: sandbox.stub() } as any
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('decrypts url and authToken from endpoint.endpoint and returns channelData without a connection', async () => {
    channelEndpointRepository.find.resolves([
      buildGrafanaEndpoint({
        endpoint: encryptChannelEndpoint(ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION, {
          url: 'https://acme.grafana.net/integrations/v1/formatted_webhook/m12xmIjOcgwH74UF8CN4dk0Dh/',
          authToken: 'glsa_secret123',
        }),
      }),
    ]);

    const result = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL }));

    expect(result).to.deep.equal([
      {
        integrationIdentifier: GRAFANA_INTEGRATION_IDENTIFIER,
        providerId: ToolProviderIdEnum.Grafana,
        channelData: [
          {
            type: ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION,
            identifier: 'grafana-endpoint',
            endpoint: {
              url: 'https://acme.grafana.net/integrations/v1/formatted_webhook/m12xmIjOcgwH74UF8CN4dk0Dh/',
              authToken: 'glsa_secret123',
            },
          },
        ],
      },
    ]);
    sinon.assert.notCalled(channelConnectionRepository.find);
  });

  it('decrypts url-only endpoint without authToken', async () => {
    channelEndpointRepository.find.resolves([
      buildGrafanaEndpoint({
        endpoint: encryptChannelEndpoint(ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION, {
          url: 'https://acme.grafana.net/integrations/v1/formatted_webhook/m12xmIjOcgwH74UF8CN4dk0Dh/',
        }),
      }),
    ]);

    const result = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL }));

    expect(result[0].channelData).to.deep.equal([
      {
        type: ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION,
        identifier: 'grafana-endpoint',
        endpoint: { url: 'https://acme.grafana.net/integrations/v1/formatted_webhook/m12xmIjOcgwH74UF8CN4dk0Dh/' },
      },
    ]);
    sinon.assert.notCalled(channelConnectionRepository.find);
  });

  it('throws when url is missing after decrypt', async () => {
    channelEndpointRepository.find.resolves([
      buildGrafanaEndpoint({
        endpoint: encryptChannelEndpoint(ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION, { url: '' }),
      }),
    ]);

    const error = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL })).catch((e) => e);

    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.contain('grafana-endpoint');
    expect(error.message).to.contain('missing url');
  });
});

describe('ResolveChannelEndpoints - Tool Webhook', () => {
  let sandbox: sinon.SinonSandbox;
  let channelEndpointRepository: Record<string, sinon.SinonStub>;
  let channelConnectionRepository: Record<string, sinon.SinonStub>;
  let usecase: ResolveChannelEndpoints;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    channelEndpointRepository = {
      find: sandbox.stub(),
      buildContextExactMatchQuery: sandbox.stub().returns({}),
    };
    channelConnectionRepository = {
      find: sandbox.stub(),
      buildContextExactMatchQuery: sandbox.stub().returns({}),
    };

    usecase = new ResolveChannelEndpoints(
      channelEndpointRepository as any,
      channelConnectionRepository as any,
      { findOne: sandbox.stub() } as any,
      { getBotFrameworkToken: sandbox.stub() } as any,
      { refreshAccessToken: sandbox.stub() } as any
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('decrypts url/headers from endpoint.endpoint and returns channelData with method, without a connection', async () => {
    channelEndpointRepository.find.resolves([
      buildToolWebhookEndpoint({
        endpoint: encryptChannelEndpoint(ENDPOINT_TYPES.TOOL_WEBHOOK, {
          url: 'https://hooks.example.com/inbound',
          headers: { Authorization: 'Bearer secret-token' },
          method: 'PUT',
        }),
      }),
    ]);

    const result = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL }));

    expect(result).to.deep.equal([
      {
        integrationIdentifier: TOOL_WEBHOOK_INTEGRATION_IDENTIFIER,
        providerId: ToolProviderIdEnum.Webhook,
        channelData: [
          {
            type: ENDPOINT_TYPES.TOOL_WEBHOOK,
            identifier: 'tool-webhook-endpoint',
            endpoint: {
              url: 'https://hooks.example.com/inbound',
              headers: { Authorization: 'Bearer secret-token' },
              method: 'PUT',
            },
          },
        ],
      },
    ]);
    sinon.assert.notCalled(channelConnectionRepository.find);
  });

  it('decrypts url-only endpoint without headers/method', async () => {
    channelEndpointRepository.find.resolves([
      buildToolWebhookEndpoint({
        endpoint: encryptChannelEndpoint(ENDPOINT_TYPES.TOOL_WEBHOOK, {
          url: 'https://hooks.example.com/inbound',
        }),
      }),
    ]);

    const result = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL }));

    expect(result[0].channelData).to.deep.equal([
      {
        type: ENDPOINT_TYPES.TOOL_WEBHOOK,
        identifier: 'tool-webhook-endpoint',
        endpoint: { url: 'https://hooks.example.com/inbound' },
      },
    ]);
    sinon.assert.notCalled(channelConnectionRepository.find);
  });

  it('throws when url is missing after decrypt', async () => {
    channelEndpointRepository.find.resolves([
      buildToolWebhookEndpoint({
        endpoint: encryptChannelEndpoint(ENDPOINT_TYPES.TOOL_WEBHOOK, { url: '' }),
      }),
    ]);

    const error = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL })).catch((e) => e);

    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.contain('tool-webhook-endpoint');
    expect(error.message).to.contain('missing url');
  });
});

function buildCommand(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: ORGANIZATION_ID,
    environmentId: ENVIRONMENT_ID,
    userId: 'user_123',
    subscriberId: SUBSCRIBER_ID,
    channelType: ChannelTypeEnum.CHAT,
    contextKeys: [],
    ...overrides,
  } as any;
}

function buildWebexEndpoint(overrides: Record<string, unknown> = {}) {
  return {
    _environmentId: ENVIRONMENT_ID,
    _organizationId: ORGANIZATION_ID,
    identifier: 'webex-endpoint',
    integrationIdentifier: INTEGRATION_IDENTIFIER,
    providerId: ChatProviderIdEnum.WebexMessaging,
    channel: ChannelTypeEnum.CHAT,
    subscriberId: SUBSCRIBER_ID,
    contextKeys: [],
    connectionIdentifier: CONNECTION_IDENTIFIER,
    type: ENDPOINT_TYPES.WEBEX_ROOM,
    endpoint: { roomId: 'room_123' },
    ...overrides,
  };
}

function buildWebexConnection(auth: {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  refreshTokenExpiresAt?: string;
}) {
  return {
    _environmentId: ENVIRONMENT_ID,
    _organizationId: ORGANIZATION_ID,
    identifier: CONNECTION_IDENTIFIER,
    integrationIdentifier: INTEGRATION_IDENTIFIER,
    providerId: ChatProviderIdEnum.WebexMessaging,
    channel: ChannelTypeEnum.CHAT,
    contextKeys: [],
    auth: encryptChannelConnectionAuth(auth),
  };
}

const PAGERDUTY_INTEGRATION_IDENTIFIER = 'pagerduty-integration';

function buildPagerDutyEndpoint(overrides: Record<string, unknown> = {}) {
  return {
    _environmentId: ENVIRONMENT_ID,
    _organizationId: ORGANIZATION_ID,
    identifier: 'pagerduty-endpoint',
    integrationIdentifier: PAGERDUTY_INTEGRATION_IDENTIFIER,
    providerId: ToolProviderIdEnum.PagerDuty,
    channel: ChannelTypeEnum.TOOL,
    subscriberId: SUBSCRIBER_ID,
    contextKeys: [],
    type: ENDPOINT_TYPES.PAGERDUTY_SERVICE,
    endpoint: {},
    ...overrides,
  };
}

const OPSGENIE_INTEGRATION_IDENTIFIER = 'opsgenie-integration';

function buildOpsgenieEndpoint(overrides: Record<string, unknown> = {}) {
  return {
    _environmentId: ENVIRONMENT_ID,
    _organizationId: ORGANIZATION_ID,
    identifier: 'opsgenie-endpoint',
    integrationIdentifier: OPSGENIE_INTEGRATION_IDENTIFIER,
    providerId: ToolProviderIdEnum.Opsgenie,
    channel: ChannelTypeEnum.TOOL,
    subscriberId: SUBSCRIBER_ID,
    contextKeys: [],
    type: ENDPOINT_TYPES.OPSGENIE_INTEGRATION,
    endpoint: {},
    ...overrides,
  };
}

const GRAFANA_INTEGRATION_IDENTIFIER = 'grafana-integration';

function buildGrafanaEndpoint(overrides: Record<string, unknown> = {}) {
  return {
    _environmentId: ENVIRONMENT_ID,
    _organizationId: ORGANIZATION_ID,
    identifier: 'grafana-endpoint',
    integrationIdentifier: GRAFANA_INTEGRATION_IDENTIFIER,
    providerId: ToolProviderIdEnum.Grafana,
    channel: ChannelTypeEnum.TOOL,
    subscriberId: SUBSCRIBER_ID,
    contextKeys: [],
    type: ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION,
    endpoint: {},
    ...overrides,
  };
}

const TOOL_WEBHOOK_INTEGRATION_IDENTIFIER = 'tool-webhook-integration';

function buildToolWebhookEndpoint(overrides: Record<string, unknown> = {}) {
  return {
    _environmentId: ENVIRONMENT_ID,
    _organizationId: ORGANIZATION_ID,
    identifier: 'tool-webhook-endpoint',
    integrationIdentifier: TOOL_WEBHOOK_INTEGRATION_IDENTIFIER,
    providerId: ToolProviderIdEnum.Webhook,
    channel: ChannelTypeEnum.TOOL,
    subscriberId: SUBSCRIBER_ID,
    contextKeys: [],
    type: ENDPOINT_TYPES.TOOL_WEBHOOK,
    endpoint: {},
    ...overrides,
  };
}
