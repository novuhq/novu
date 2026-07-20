import { encryptChannelConnectionAuth } from '@novu/application-generic';
import { ChannelTypeEnum, ChatProviderIdEnum, ToolProviderIdEnum } from '@novu/shared';
import { ENDPOINT_TYPES } from '@novu/stateless';
import { expect } from 'chai';
import sinon from 'sinon';
import { ResolveChannelEndpoints } from './resolve-channel-endpoints.usecase';

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
      { findOne: sandbox.stub() } as any,
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
      { findOne: sandbox.stub() } as any,
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
      { getConnectionToken: sandbox.stub() } as any
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('hydrates the Opsgenie endpoint wire shape from decrypted connection auth', async () => {
    channelEndpointRepository.find.resolves([buildOpsgenieEndpoint()]);
    channelConnectionRepository.find.resolves([buildOpsgenieConnection({ apiKey: 'genie-key-123', region: 'eu' })]);

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
    expect(channelConnectionRepository.find.firstCall.args[0].identifier).to.deep.equal({
      $in: [OPSGENIE_CONNECTION_IDENTIFIER],
    });
  });

  it('throws when the linked channel connection is missing', async () => {
    channelEndpointRepository.find.resolves([buildOpsgenieEndpoint()]);
    channelConnectionRepository.find.resolves([]);

    const error = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL })).catch((e) => e);

    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.contain('opsgenie-endpoint');
    expect(error.message).to.contain('no auth is available');
  });

  it('throws when the connection auth is missing apiKey or region', async () => {
    channelEndpointRepository.find.resolves([buildOpsgenieEndpoint()]);
    channelConnectionRepository.find.resolves([buildOpsgenieConnection({ apiKey: 'genie-key-123' })]);

    const error = await usecase.execute(buildCommand({ channelType: ChannelTypeEnum.TOOL })).catch((e) => e);

    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.contain('missing apiKey or region');
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
const OPSGENIE_CONNECTION_IDENTIFIER = 'opsgenie-connection';

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
    connectionIdentifier: OPSGENIE_CONNECTION_IDENTIFIER,
    type: ENDPOINT_TYPES.OPSGENIE_INTEGRATION,
    endpoint: {},
    ...overrides,
  };
}

function buildOpsgenieConnection(auth: { apiKey: string; region?: 'us' | 'eu' }) {
  return {
    _environmentId: ENVIRONMENT_ID,
    _organizationId: ORGANIZATION_ID,
    identifier: OPSGENIE_CONNECTION_IDENTIFIER,
    integrationIdentifier: OPSGENIE_INTEGRATION_IDENTIFIER,
    providerId: ToolProviderIdEnum.Opsgenie,
    channel: ChannelTypeEnum.TOOL,
    contextKeys: [],
    auth: encryptChannelConnectionAuth(auth),
  };
}
