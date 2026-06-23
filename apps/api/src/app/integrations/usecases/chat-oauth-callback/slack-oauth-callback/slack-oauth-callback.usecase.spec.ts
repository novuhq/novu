import { GetNovuProviderCredentials } from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  ContextRepository,
  EnvironmentRepository,
  IntegrationRepository,
} from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import axios from 'axios';
import { expect } from 'chai';
import { createHmac } from 'crypto';
import sinon from 'sinon';
import { CreateChannelConnection } from '../../../../channel-connections/usecases/create-channel-connection/create-channel-connection.usecase';
import { UpdateChannelConnection } from '../../../../channel-connections/usecases/update-channel-connection/update-channel-connection.usecase';
import { CreateChannelEndpoint } from '../../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { encodeOAuthState } from '../../generate-chat-oath-url/chat-oauth-state.util';
import { SlackOauthCallbackCommand } from './slack-oauth-callback.command';
import { SlackOauthCallback } from './slack-oauth-callback.usecase';

const MOCK_ENVIRONMENT_ID = 'env-id-123';
const MOCK_ORGANIZATION_ID = 'org-id-456';
const MOCK_API_KEY = 'test-api-key-for-hmac';
const MOCK_CLIENT_ID = 'slack-client-id';
const MOCK_SECRET_KEY = 'slack-secret-key';
const MOCK_INTEGRATION_IDENTIFIER = 'slack-integration';
const MOCK_SUBSCRIBER_ID = 'subscriber-abc';
const MOCK_SLACK_USER_ID = 'U012AB3CD';
const MOCK_TEAM_ID = 'T012AB3CD';
const MOCK_TEAM_NAME = 'My Workspace';
const MOCK_CONNECTION_IDENTIFIER = 'connect:user-1:agent:agent-1';
const MOCK_ACCESS_TOKEN = 'xoxb-mock-access-token';
const MOCK_REFRESHED_ACCESS_TOKEN = 'xoxb-refreshed-access-token';
const MOCK_API_ROOT_URL = 'https://api.novu.co';

function buildMockIntegration(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'integration-id',
    _environmentId: MOCK_ENVIRONMENT_ID,
    _organizationId: MOCK_ORGANIZATION_ID,
    identifier: MOCK_INTEGRATION_IDENTIFIER,
    providerId: ChatProviderIdEnum.Slack,
    channel: 'chat',
    credentials: {
      clientId: MOCK_CLIENT_ID,
      secretKey: MOCK_SECRET_KEY,
    },
    ...overrides,
  } as any;
}

function buildEncodedState(payload: Record<string, unknown>): string {
  const payloadStr = JSON.stringify({ ...payload, timestamp: Date.now() });
  const signature = createHmac('sha256', MOCK_API_KEY).update(payloadStr).digest('hex');

  return encodeOAuthState(payloadStr, signature);
}

function buildSlackAuthResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    access_token: MOCK_ACCESS_TOKEN,
    team: { id: MOCK_TEAM_ID, name: MOCK_TEAM_NAME },
    authed_user: { id: MOCK_SLACK_USER_ID },
    ...overrides,
  };
}

function createSlackOauthCallbackHarness() {
  const integrationRepository = sinon.createStubInstance(IntegrationRepository);
  const environmentRepository = sinon.createStubInstance(EnvironmentRepository);
  const channelConnectionRepository = sinon.createStubInstance(ChannelConnectionRepository);
  const contextRepository = sinon.createStubInstance(ContextRepository);
  const createChannelConnection = sinon.createStubInstance(CreateChannelConnection);
  const updateChannelConnection = sinon.createStubInstance(UpdateChannelConnection);
  const createChannelEndpoint = sinon.createStubInstance(CreateChannelEndpoint);
  const getNovuProviderCredentials = sinon.createStubInstance(GetNovuProviderCredentials);

  const usecase = new SlackOauthCallback(
    integrationRepository as any,
    environmentRepository as any,
    getNovuProviderCredentials as any,
    channelConnectionRepository as any,
    contextRepository as any,
    createChannelConnection as any,
    updateChannelConnection as any,
    createChannelEndpoint as any
  );

  return {
    usecase,
    integrationRepository,
    environmentRepository,
    channelConnectionRepository,
    contextRepository,
    createChannelConnection,
    updateChannelConnection,
    createChannelEndpoint,
    getNovuProviderCredentials,
  };
}

describe('SlackOauthCallback — autoLinkUser', () => {
  let harness: ReturnType<typeof createSlackOauthCallbackHarness>;
  let axiosPost: sinon.SinonStub;
  let originalApiRootUrl: string | undefined;

  beforeEach(() => {
    harness = createSlackOauthCallbackHarness();

    originalApiRootUrl = process.env.API_ROOT_URL;
    process.env.API_ROOT_URL = MOCK_API_ROOT_URL;

    harness.environmentRepository.findOne.resolves({
      _id: MOCK_ENVIRONMENT_ID,
      apiKeys: [{ key: MOCK_API_KEY }],
    } as any);

    harness.environmentRepository.getApiKeys.resolves([{ key: MOCK_API_KEY }] as any);

    harness.integrationRepository.findOne.resolves(buildMockIntegration());
    harness.channelConnectionRepository.findOne.resolves(null);
    harness.channelConnectionRepository.buildContextExactMatchQuery.returns({});
    harness.contextRepository.findOrCreateContextsFromPayload.resolves([]);

    axiosPost = sinon.stub(axios, 'post').resolves({ data: buildSlackAuthResponse() });

    harness.createChannelConnection.execute.resolves({ identifier: 'conn-abc' } as any);
    harness.createChannelEndpoint.execute.resolves({} as any);
  });

  afterEach(() => {
    sinon.restore();
    process.env.API_ROOT_URL = originalApiRootUrl;
  });

  it('should create connection AND endpoint when autoLinkUser=true, subscriberId, and authed_user.id are present', async () => {
    const state = buildEncodedState({
      environmentId: MOCK_ENVIRONMENT_ID,
      organizationId: MOCK_ORGANIZATION_ID,
      integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.Slack,
      subscriberId: MOCK_SUBSCRIBER_ID,
      autoLinkUser: true,
    });

    const command = SlackOauthCallbackCommand.create({
      providerCode: 'slack-code',
      state,
    });

    await harness.usecase.execute(command);

    expect(harness.createChannelConnection.execute.calledOnce).to.be.true;
    expect(harness.createChannelEndpoint.execute.calledOnce).to.be.true;

    const endpointArg = harness.createChannelEndpoint.execute.firstCall.args[0];
    expect(endpointArg.subscriberId).to.equal(MOCK_SUBSCRIBER_ID);
    expect(endpointArg.type).to.equal(ENDPOINT_TYPES.SLACK_USER);
    expect(endpointArg.endpoint.userId).to.equal(MOCK_SLACK_USER_ID);
  });

  it('should create connection but skip endpoint when autoLinkUser=true and subscriberId present but authed_user.id is missing', async () => {
    axiosPost.resolves({
      data: buildSlackAuthResponse({ authed_user: undefined }),
    });

    const state = buildEncodedState({
      environmentId: MOCK_ENVIRONMENT_ID,
      organizationId: MOCK_ORGANIZATION_ID,
      integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.Slack,
      subscriberId: MOCK_SUBSCRIBER_ID,
      autoLinkUser: true,
    });

    const command = SlackOauthCallbackCommand.create({
      providerCode: 'slack-code',
      state,
    });

    await harness.usecase.execute(command);

    expect(harness.createChannelConnection.execute.calledOnce).to.be.true;
    expect(harness.createChannelEndpoint.execute.called).to.be.false;
  });

  it('should create connection but skip endpoint when autoLinkUser=false even if subscriberId and authed_user.id are present', async () => {
    const state = buildEncodedState({
      environmentId: MOCK_ENVIRONMENT_ID,
      organizationId: MOCK_ORGANIZATION_ID,
      integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.Slack,
      subscriberId: MOCK_SUBSCRIBER_ID,
      autoLinkUser: false,
    });

    const command = SlackOauthCallbackCommand.create({
      providerCode: 'slack-code',
      state,
    });

    await harness.usecase.execute(command);

    expect(harness.createChannelConnection.execute.calledOnce).to.be.true;
    expect(harness.createChannelEndpoint.execute.called).to.be.false;
  });

  it('should create connection but skip endpoint when autoLinkUser is absent (raw API callers default to false)', async () => {
    const state = buildEncodedState({
      environmentId: MOCK_ENVIRONMENT_ID,
      organizationId: MOCK_ORGANIZATION_ID,
      integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.Slack,
      subscriberId: MOCK_SUBSCRIBER_ID,
    });

    const command = SlackOauthCallbackCommand.create({
      providerCode: 'slack-code',
      state,
    });

    await harness.usecase.execute(command);

    expect(harness.createChannelConnection.execute.calledOnce).to.be.true;
    expect(harness.createChannelEndpoint.execute.called).to.be.false;
  });

  it('should create connection but skip endpoint when autoLinkUser=true but subscriberId is absent', async () => {
    const state = buildEncodedState({
      environmentId: MOCK_ENVIRONMENT_ID,
      organizationId: MOCK_ORGANIZATION_ID,
      integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.Slack,
      autoLinkUser: true,
    });

    const command = SlackOauthCallbackCommand.create({
      providerCode: 'slack-code',
      state,
    });

    await harness.usecase.execute(command);

    expect(harness.createChannelConnection.execute.calledOnce).to.be.true;
    expect(harness.createChannelEndpoint.execute.called).to.be.false;
  });
});

describe('SlackOauthCallback — reconnect token refresh', () => {
  let harness: ReturnType<typeof createSlackOauthCallbackHarness>;
  let originalApiRootUrl: string | undefined;

  beforeEach(() => {
    harness = createSlackOauthCallbackHarness();

    originalApiRootUrl = process.env.API_ROOT_URL;
    process.env.API_ROOT_URL = MOCK_API_ROOT_URL;

    harness.environmentRepository.findOne.resolves({
      _id: MOCK_ENVIRONMENT_ID,
      apiKeys: [{ key: MOCK_API_KEY }],
    } as any);

    harness.integrationRepository.findOne.resolves(buildMockIntegration());
    harness.channelConnectionRepository.buildContextExactMatchQuery.returns({});
    harness.contextRepository.findOrCreateContextsFromPayload.resolves([]);

    sinon.stub(axios, 'post').resolves({
      data: buildSlackAuthResponse({ access_token: MOCK_REFRESHED_ACCESS_TOKEN }),
    });

    harness.updateChannelConnection.execute.resolves({
      identifier: MOCK_CONNECTION_IDENTIFIER,
      auth: { accessToken: MOCK_REFRESHED_ACCESS_TOKEN },
    } as any);
  });

  afterEach(() => {
    sinon.restore();
    process.env.API_ROOT_URL = originalApiRootUrl;
  });

  it('should update the existing connection token when reconnecting with the same identifier', async () => {
    harness.channelConnectionRepository.findOne.onFirstCall().resolves({
      identifier: MOCK_CONNECTION_IDENTIFIER,
    } as any);

    const state = buildEncodedState({
      environmentId: MOCK_ENVIRONMENT_ID,
      organizationId: MOCK_ORGANIZATION_ID,
      integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.Slack,
      identifier: MOCK_CONNECTION_IDENTIFIER,
      subscriberId: MOCK_SUBSCRIBER_ID,
    });

    const command = SlackOauthCallbackCommand.create({
      providerCode: 'slack-code',
      state,
    });

    await harness.usecase.execute(command);

    expect(harness.createChannelConnection.execute.called).to.be.false;
    expect(harness.updateChannelConnection.execute.calledOnce).to.be.true;
    expect(harness.contextRepository.findOrCreateContextsFromPayload.called).to.be.false;

    const updateArg = harness.updateChannelConnection.execute.firstCall.args[0];
    expect(updateArg.identifier).to.equal(MOCK_CONNECTION_IDENTIFIER);
    expect(updateArg.auth.accessToken).to.equal(MOCK_REFRESHED_ACCESS_TOKEN);
    expect(updateArg.workspace.id).to.equal(MOCK_TEAM_ID);
    expect(updateArg.workspace.name).to.equal(MOCK_TEAM_NAME);
  });

  it('should update connection and create endpoint when autoLinkUser=true on reconnect', async () => {
    harness.channelConnectionRepository.findOne.onFirstCall().resolves({
      identifier: MOCK_CONNECTION_IDENTIFIER,
    } as any);
    harness.updateChannelConnection.execute.resolves({
      identifier: MOCK_CONNECTION_IDENTIFIER,
    } as any);

    const state = buildEncodedState({
      environmentId: MOCK_ENVIRONMENT_ID,
      organizationId: MOCK_ORGANIZATION_ID,
      integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.Slack,
      identifier: MOCK_CONNECTION_IDENTIFIER,
      subscriberId: MOCK_SUBSCRIBER_ID,
      autoLinkUser: true,
    });

    const command = SlackOauthCallbackCommand.create({
      providerCode: 'slack-code',
      state,
    });

    await harness.usecase.execute(command);

    expect(harness.createChannelConnection.execute.called).to.be.false;
    expect(harness.updateChannelConnection.execute.calledOnce).to.be.true;
    expect(harness.createChannelEndpoint.execute.calledOnce).to.be.true;

    const endpointArg = harness.createChannelEndpoint.execute.firstCall.args[0];
    expect(endpointArg.connectionIdentifier).to.equal(MOCK_CONNECTION_IDENTIFIER);
    expect(endpointArg.subscriberId).to.equal(MOCK_SUBSCRIBER_ID);
    expect(endpointArg.endpoint.userId).to.equal(MOCK_SLACK_USER_ID);
  });

  it('should update the existing connection token when reconnecting with the same integration, subscriber, and context', async () => {
    harness.channelConnectionRepository.findOne.resolves({
      identifier: 'existing-generated-identifier',
    } as any);

    const state = buildEncodedState({
      environmentId: MOCK_ENVIRONMENT_ID,
      organizationId: MOCK_ORGANIZATION_ID,
      integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.Slack,
      subscriberId: MOCK_SUBSCRIBER_ID,
    });

    const command = SlackOauthCallbackCommand.create({
      providerCode: 'slack-code',
      state,
    });

    await harness.usecase.execute(command);

    expect(harness.createChannelConnection.execute.called).to.be.false;
    expect(harness.updateChannelConnection.execute.calledOnce).to.be.true;

    const updateArg = harness.updateChannelConnection.execute.firstCall.args[0];
    expect(updateArg.identifier).to.equal('existing-generated-identifier');
    expect(updateArg.auth.accessToken).to.equal(MOCK_REFRESHED_ACCESS_TOKEN);
  });
});
