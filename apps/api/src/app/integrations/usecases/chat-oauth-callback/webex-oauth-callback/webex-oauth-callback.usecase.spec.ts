import { createHmac } from 'node:crypto';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateChannelConnection } from '../../../../channel-connections/usecases/create-channel-connection/create-channel-connection.usecase';
import { CreateChannelEndpoint } from '../../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { encodeOAuthState } from '../../generate-chat-oath-url/chat-oauth-state.util';
import { WebexOauthCallbackCommand } from './webex-oauth-callback.command';
import { WebexOauthCallback } from './webex-oauth-callback.usecase';

const MOCK_ENVIRONMENT_ID = 'env-id-123';
const MOCK_ORGANIZATION_ID = 'org-id-456';
const MOCK_API_KEY = 'test-api-key-for-hmac';
const MOCK_CLIENT_ID = 'webex-client-id';
const MOCK_SECRET_KEY = 'webex-secret-key';
const MOCK_INTEGRATION_IDENTIFIER = 'webex-integration';
const MOCK_SUBSCRIBER_ID = 'subscriber-abc';
const MOCK_PERSON_ID = 'person-id';
const MOCK_ORG_ID = 'org-id';
const MOCK_ACCESS_TOKEN = 'webex-access-token';
const MOCK_REFRESH_TOKEN = 'webex-refresh-token';
const MOCK_API_ROOT_URL = 'https://api.novu.co';

function buildMockIntegration(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'integration-id',
    _environmentId: MOCK_ENVIRONMENT_ID,
    _organizationId: MOCK_ORGANIZATION_ID,
    identifier: MOCK_INTEGRATION_IDENTIFIER,
    providerId: ChatProviderIdEnum.WebexMessaging,
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

describe('WebexOauthCallback', () => {
  let usecase: WebexOauthCallback;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let createChannelConnection: sinon.SinonStubbedInstance<CreateChannelConnection>;
  let createChannelEndpoint: sinon.SinonStubbedInstance<CreateChannelEndpoint>;
  let axiosPost: sinon.SinonStub;
  let axiosGet: sinon.SinonStub;
  let originalApiRootUrl: string | undefined;

  beforeEach(() => {
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    createChannelConnection = sinon.createStubInstance(CreateChannelConnection);
    createChannelEndpoint = sinon.createStubInstance(CreateChannelEndpoint);

    usecase = new WebexOauthCallback(
      integrationRepository as any,
      environmentRepository as any,
      createChannelConnection as any,
      createChannelEndpoint as any
    );

    originalApiRootUrl = process.env.API_ROOT_URL;
    process.env.API_ROOT_URL = MOCK_API_ROOT_URL;

    environmentRepository.findOne.resolves({
      _id: MOCK_ENVIRONMENT_ID,
      apiKeys: [{ key: MOCK_API_KEY }],
    } as any);

    integrationRepository.findOne.resolves(buildMockIntegration());
    createChannelConnection.execute.resolves({ identifier: 'conn-abc' } as any);
    createChannelEndpoint.execute.resolves({} as any);

    axiosPost = sinon.stub(axios, 'post').resolves({
      data: {
        access_token: MOCK_ACCESS_TOKEN,
        expires_in: 1209600,
        refresh_token: MOCK_REFRESH_TOKEN,
        refresh_token_expires_in: 7776000,
      },
    });
    axiosGet = sinon.stub(axios, 'get').resolves({
      data: {
        id: MOCK_PERSON_ID,
        orgId: MOCK_ORG_ID,
        displayName: 'Webex User',
        emails: ['user@example.com'],
      },
    });
  });

  afterEach(() => {
    sinon.restore();
    process.env.API_ROOT_URL = originalApiRootUrl;
  });

  it('should create a Webex connection and auto-link the authenticated person endpoint', async () => {
    const state = buildEncodedState({
      environmentId: MOCK_ENVIRONMENT_ID,
      organizationId: MOCK_ORGANIZATION_ID,
      integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.WebexMessaging,
      subscriberId: MOCK_SUBSCRIBER_ID,
      autoLinkUser: true,
    });

    const command = WebexOauthCallbackCommand.create({
      providerCode: 'webex-code',
      state,
    });

    await usecase.execute(command);

    expect(axiosPost.calledOnce).to.be.true;
    expect(axiosGet.calledOnce).to.be.true;
    expect(createChannelConnection.execute.calledOnce).to.be.true;
    expect(createChannelEndpoint.execute.calledOnce).to.be.true;

    const connectionArg = createChannelConnection.execute.firstCall.args[0];
    expect(connectionArg.integrationIdentifier).to.equal(MOCK_INTEGRATION_IDENTIFIER);
    expect(connectionArg.auth.accessToken).to.equal(MOCK_ACCESS_TOKEN);
    expect(connectionArg.auth.refreshToken).to.equal(MOCK_REFRESH_TOKEN);
    expect(connectionArg.auth.expiresAt).to.be.a('string');
    expect(connectionArg.workspace.id).to.equal(MOCK_ORG_ID);

    const endpointArg = createChannelEndpoint.execute.firstCall.args[0];
    expect(endpointArg.connectionIdentifier).to.equal('conn-abc');
    expect(endpointArg.subscriberId).to.equal(MOCK_SUBSCRIBER_ID);
    expect(endpointArg.type).to.equal(ENDPOINT_TYPES.WEBEX_PERSON);
    expect(endpointArg.endpoint.personId).to.equal(MOCK_PERSON_ID);
  });

  it('should create a Webex person endpoint in link_user mode without creating a new connection', async () => {
    const state = buildEncodedState({
      environmentId: MOCK_ENVIRONMENT_ID,
      organizationId: MOCK_ORGANIZATION_ID,
      integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.WebexMessaging,
      subscriberId: MOCK_SUBSCRIBER_ID,
      identifier: 'existing-webex-connection',
      mode: 'link_user',
    });

    const command = WebexOauthCallbackCommand.create({
      providerCode: 'webex-code',
      state,
    });

    await usecase.execute(command);

    expect(createChannelConnection.execute.called).to.be.false;
    expect(createChannelEndpoint.execute.calledOnce).to.be.true;

    const endpointArg = createChannelEndpoint.execute.firstCall.args[0];
    expect(endpointArg.connectionIdentifier).to.equal('existing-webex-connection');
    expect(endpointArg.type).to.equal(ENDPOINT_TYPES.WEBEX_PERSON);
    expect(endpointArg.endpoint.personId).to.equal(MOCK_PERSON_ID);
  });
});
