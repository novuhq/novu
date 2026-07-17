import {
  decryptChannelConnectionAuth,
  encryptChannelConnectionAuth,
  type WebexTokenRefreshResponse,
} from '@novu/application-generic';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
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
