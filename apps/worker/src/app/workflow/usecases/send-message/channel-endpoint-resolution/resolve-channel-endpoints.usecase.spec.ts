import { encryptChannelConnectionAuth, encryptChannelEndpoint } from '@novu/application-generic';
import { type ChannelEndpointByType, ChannelTypeEnum, ChatProviderIdEnum, ToolProviderIdEnum } from '@novu/shared';
import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect } from 'chai';
import sinon from 'sinon';
import { ResolveChannelEndpoints } from './resolve-channel-endpoints.usecase';

function stubIntegrationRepository(sandbox: sinon.SinonSandbox) {
  return {
    findOne: sandbox.stub(),
    find: sandbox.stub().callsFake(async (query: { identifier?: { $in?: string[] } }) => {
      const identifiers = query.identifier?.$in ?? [];

      return identifiers.map((identifier) => ({ identifier, active: true }));
    }),
  };
}

const ORGANIZATION_ID = 'org_123';
const ENVIRONMENT_ID = 'env_123';
const SUBSCRIBER_ID = 'subscriber_123';
const INTEGRATION_IDENTIFIER = 'webex-integration';
const CONNECTION_IDENTIFIER = 'webex-connection';

describe('ResolveChannelEndpoints - Webex Messaging', () => {
  let sandbox: sinon.SinonSandbox;
  let channelEndpointRepository: Record<string, sinon.SinonStub>;
  let channelConnectionRepository: Record<string, sinon.SinonStub>;
  let rotatingConnectionTokenService: Record<string, sinon.SinonStub>;
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
    rotatingConnectionTokenService = {
      getConnectionToken: sandbox.stub(),
    };

    usecase = new ResolveChannelEndpoints(
      channelEndpointRepository as any,
      channelConnectionRepository as any,
      stubIntegrationRepository(sandbox) as any,
      { getBotFrameworkToken: sandbox.stub() } as any,
      rotatingConnectionTokenService as any
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('resolves Webex endpoints through the rotating token service so rotation-enabled tokens get refreshed', async () => {
    const connection = buildWebexConnection({ accessToken: 'stored-token', refreshToken: 'refresh-token' });
    channelEndpointRepository.find.resolves([
      buildWebexEndpoint({
        identifier: 'webex-room-endpoint',
        endpoint: { roomId: 'room_123' },
        type: ENDPOINT_TYPES.WEBEX_ROOM,
      }),
    ]);
    channelConnectionRepository.find.resolves([connection]);
    rotatingConnectionTokenService.getConnectionToken.resolves('fresh-token');

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
            token: 'fresh-token',
          },
        ],
      },
    ]);
    sinon.assert.calledOnceWithExactly(rotatingConnectionTokenService.getConnectionToken, connection);
    expect(channelConnectionRepository.find.firstCall.args[0].identifier).to.deep.equal({
      $in: [CONNECTION_IDENTIFIER],
    });
  });

  it('maps the resolved token to every endpoint of the connection', async () => {
    const connection = buildWebexConnection({ accessToken: 'stored-token', refreshToken: 'refresh-token' });
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
    channelConnectionRepository.find.resolves([connection]);
    rotatingConnectionTokenService.getConnectionToken.resolves('fresh-token');

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
  });
});

describe('ResolveChannelEndpoints - Slack', () => {
  let sandbox: sinon.SinonSandbox;
  let channelEndpointRepository: Record<string, sinon.SinonStub>;
  let channelConnectionRepository: Record<string, sinon.SinonStub>;
  let rotatingConnectionTokenService: Record<string, sinon.SinonStub>;
  let integrationRepository: ReturnType<typeof stubIntegrationRepository>;
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
    rotatingConnectionTokenService = {
      getConnectionToken: sandbox.stub(),
    };
    integrationRepository = stubIntegrationRepository(sandbox);

    usecase = new ResolveChannelEndpoints(
      channelEndpointRepository as any,
      channelConnectionRepository as any,
      integrationRepository as any,
      { getBotFrameworkToken: sandbox.stub() } as any,
      rotatingConnectionTokenService as any
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('resolves Slack endpoints through the rotating token service so rotation-enabled tokens get refreshed', async () => {
    const connection = buildSlackConnection({ accessToken: 'xoxb-fresh-token' });
    channelEndpointRepository.find.resolves([buildSlackEndpoint()]);
    channelConnectionRepository.find.resolves([connection]);
    rotatingConnectionTokenService.getConnectionToken.resolves('xoxb-fresh-token');

    const result = await usecase.execute(buildCommand());

    expect(result).to.deep.equal([
      {
        integrationIdentifier: SLACK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.Slack,
        channelData: [
          {
            type: ENDPOINT_TYPES.SLACK_CHANNEL,
            identifier: 'slack-endpoint',
            endpoint: { channelId: 'C123' },
            token: 'xoxb-fresh-token',
          },
        ],
      },
    ]);
    sinon.assert.calledOnceWithExactly(rotatingConnectionTokenService.getConnectionToken, connection);
  });

  it('returns an empty token when the Slack endpoint has no linked connection', async () => {
    channelEndpointRepository.find.resolves([buildSlackEndpoint({ connectionIdentifier: undefined })]);
    channelConnectionRepository.find.resolves([]);

    const result = await usecase.execute(buildCommand());

    expect(result[0].channelData[0]).to.deep.include({ token: '' });
    sinon.assert.notCalled(rotatingConnectionTokenService.getConnectionToken);
  });

  it('does not load connections or refresh tokens for endpoints without an active integration', async () => {
    const connection = buildSlackConnection({ accessToken: 'xoxb-stale-token', refreshToken: 'refresh-token' });
    channelEndpointRepository.find.resolves([buildSlackEndpoint()]);
    channelConnectionRepository.find.resolves([connection]);
    integrationRepository.find.resolves([]);

    const result = await usecase.execute(buildCommand());

    expect(result).to.deep.equal([]);
    expect(integrationRepository.find.firstCall.args[0]).to.deep.include({
      _environmentId: ENVIRONMENT_ID,
      _organizationId: ORGANIZATION_ID,
      channel: ChannelTypeEnum.CHAT,
      active: true,
    });
    expect(integrationRepository.find.firstCall.args[0].identifier).to.deep.equal({
      $in: [SLACK_INTEGRATION_IDENTIFIER],
    });
    sinon.assert.notCalled(rotatingConnectionTokenService.getConnectionToken);
    sinon.assert.notCalled(channelConnectionRepository.find);
  });

  it('refreshes only the active Slack integration when a subscriber still has a leftover deleted one', async () => {
    const liveIdentifier = 'slack-live';
    const liveConnectionIdentifier = 'slack-live-connection';
    const liveConnection = buildSlackConnection({ accessToken: 'xoxb-live-token' });
    liveConnection.identifier = liveConnectionIdentifier;
    liveConnection.integrationIdentifier = liveIdentifier;

    channelEndpointRepository.find.resolves([
      buildSlackEndpoint(),
      buildSlackEndpoint({
        identifier: 'slack-live-endpoint',
        integrationIdentifier: liveIdentifier,
        connectionIdentifier: liveConnectionIdentifier,
      }),
    ]);
    channelConnectionRepository.find.resolves([liveConnection]);
    rotatingConnectionTokenService.getConnectionToken.resolves('xoxb-live-token');
    integrationRepository.find.resolves([{ identifier: liveIdentifier, active: true }]);

    const result = await usecase.execute(buildCommand());

    expect(result).to.have.length(1);
    expect(result[0].integrationIdentifier).to.equal(liveIdentifier);
    expect(result[0].channelData[0]).to.deep.include({ token: 'xoxb-live-token' });
    sinon.assert.calledOnceWithExactly(rotatingConnectionTokenService.getConnectionToken, liveConnection);
    expect(channelConnectionRepository.find.firstCall.args[0].identifier).to.deep.equal({
      $in: [liveConnectionIdentifier],
    });
  });
});

describe('ResolveChannelEndpoints - PagerDuty', () => {
  let sandbox: sinon.SinonSandbox;
  let channelEndpointRepository: Record<string, sinon.SinonStub>;
  let channelConnectionRepository: Record<string, sinon.SinonStub>;
  let integrationRepository: ReturnType<typeof stubIntegrationRepository>;
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
    integrationRepository = stubIntegrationRepository(sandbox);

    usecase = new ResolveChannelEndpoints(
      channelEndpointRepository as any,
      channelConnectionRepository as any,
      integrationRepository as any,
      { getBotFrameworkToken: sandbox.stub() } as any,
      { refreshAccessToken: sandbox.stub() } as any
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('does not decrypt stored secrets for endpoints without an active integration', async () => {
    channelEndpointRepository.find.resolves([
      buildPagerDutyEndpoint({
        endpoint: encryptChannelEndpoint(ENDPOINT_TYPES.PAGERDUTY_SERVICE, {
          routingKey: 'R0UTINGK3YEXAMPLE000000000000000',
          region: 'us',
        }),
      }),
    ]);
    integrationRepository.find.resolves([]);

    const result = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL }));

    expect(result).to.deep.equal([]);
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
      stubIntegrationRepository(sandbox) as any,
      { getBotFrameworkToken: sandbox.stub() } as any,
      { getConnectionToken: sandbox.stub() } as any
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
      stubIntegrationRepository(sandbox) as any,
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
      stubIntegrationRepository(sandbox) as any,
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

const SLACK_INTEGRATION_IDENTIFIER = 'slack-integration';
const SLACK_CONNECTION_IDENTIFIER = 'slack-connection';

function buildSlackEndpoint(overrides: Record<string, unknown> = {}) {
  return {
    _environmentId: ENVIRONMENT_ID,
    _organizationId: ORGANIZATION_ID,
    identifier: 'slack-endpoint',
    integrationIdentifier: SLACK_INTEGRATION_IDENTIFIER,
    providerId: ChatProviderIdEnum.Slack,
    channel: ChannelTypeEnum.CHAT,
    subscriberId: SUBSCRIBER_ID,
    contextKeys: [],
    connectionIdentifier: SLACK_CONNECTION_IDENTIFIER,
    type: ENDPOINT_TYPES.SLACK_CHANNEL,
    endpoint: { channelId: 'C123' },
    ...overrides,
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

function buildSlackConnection(auth: { accessToken: string; refreshToken?: string; expiresAt?: string }) {
  return {
    _environmentId: ENVIRONMENT_ID,
    _organizationId: ORGANIZATION_ID,
    identifier: SLACK_CONNECTION_IDENTIFIER,
    integrationIdentifier: SLACK_INTEGRATION_IDENTIFIER,
    providerId: ChatProviderIdEnum.Slack,
    channel: ChannelTypeEnum.CHAT,
    contextKeys: [],
    auth: encryptChannelConnectionAuth(auth),
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
