import { BadRequestException } from '@nestjs/common';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import axios from 'axios';
import { expect } from 'chai';
import { createHmac } from 'crypto';
import sinon from 'sinon';
import { CreateChannelConnection } from '../../../../channel-connections/usecases/create-channel-connection/create-channel-connection.usecase';
import { CreateChannelEndpoint } from '../../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { encodeOAuthState } from '../../generate-chat-oath-url/chat-oauth-state.util';
import { MsTeamsOauthCallbackCommand } from './msteams-oauth-callback.command';
import { MsTeamsOauthCallback } from './msteams-oauth-callback.usecase';

const MOCK_ENVIRONMENT_ID = 'env-id-123';
const MOCK_ORGANIZATION_ID = 'org-id-456';
const MOCK_API_KEY = 'test-api-key-for-hmac';
const MOCK_CLIENT_ID = 'azure-client-id';
const MOCK_TENANT_ID = 'azure-tenant-id';
const MOCK_SECRET_KEY = 'azure-secret-key';
const MOCK_INTEGRATION_IDENTIFIER = 'msteams-integration';
const MOCK_SUBSCRIBER_ID = 'subscriber-abc';
const MOCK_AAD_OID = 'aad-object-id-xyz';
const MOCK_API_ROOT_URL = 'https://api.novu.co';

function buildMockIntegration(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'integration-id',
    _environmentId: MOCK_ENVIRONMENT_ID,
    _organizationId: MOCK_ORGANIZATION_ID,
    identifier: MOCK_INTEGRATION_IDENTIFIER,
    providerId: ChatProviderIdEnum.MsTeams,
    channel: 'chat',
    credentials: {
      clientId: MOCK_CLIENT_ID,
      secretKey: MOCK_SECRET_KEY,
      tenantId: MOCK_TENANT_ID,
    },
    ...overrides,
  } as any;
}

function buildEncodedState(payload: Record<string, unknown>): string {
  const payloadStr = JSON.stringify({ ...payload, timestamp: Date.now() });
  const signature = createHmac('sha256', MOCK_API_KEY).update(payloadStr).digest('hex');

  return encodeOAuthState(payloadStr, signature);
}

function buildIdToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = Buffer.from('fake-sig').toString('base64url');

  return `${header}.${payload}.${signature}`;
}

describe('MsTeamsOauthCallback', () => {
  let usecase: MsTeamsOauthCallback;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let createChannelConnection: sinon.SinonStubbedInstance<CreateChannelConnection>;
  let createChannelEndpoint: sinon.SinonStubbedInstance<CreateChannelEndpoint>;
  let axiosPost: sinon.SinonStub;
  let originalApiRootUrl: string | undefined;

  beforeEach(() => {
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    createChannelConnection = sinon.createStubInstance(CreateChannelConnection);
    createChannelEndpoint = sinon.createStubInstance(CreateChannelEndpoint);

    const logger = { setContext: sinon.stub(), info: sinon.stub(), error: sinon.stub() };

    usecase = new MsTeamsOauthCallback(
      integrationRepository as any,
      environmentRepository as any,
      createChannelConnection as any,
      createChannelEndpoint as any,
      logger as any
    );

    originalApiRootUrl = process.env.API_ROOT_URL;
    process.env.API_ROOT_URL = MOCK_API_ROOT_URL;

    environmentRepository.findOne.resolves({
      _id: MOCK_ENVIRONMENT_ID,
      apiKeys: [{ key: MOCK_API_KEY }],
    } as any);

    integrationRepository.findOne.resolves(buildMockIntegration());
  });

  afterEach(() => {
    sinon.restore();
    process.env.API_ROOT_URL = originalApiRootUrl;
  });

  describe('admin consent (connect) mode', () => {
    it('should create a ChannelConnection on valid admin consent', async () => {
      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
      });

      createChannelConnection.execute.resolves({ identifier: 'conn-abc' } as any);

      const command = MsTeamsOauthCallbackCommand.create({
        tenant: 'tenant-xyz',
        adminConsent: 'True',
        state,
      });

      await usecase.execute(command);

      expect(createChannelConnection.execute.calledOnce).to.be.true;
      const callArg = createChannelConnection.execute.firstCall.args[0];
      expect(callArg.workspace.id).to.equal('tenant-xyz');
      expect(callArg.auth.accessToken).to.equal('app-only');
    });

    it('should throw if adminConsent is not "True"', async () => {
      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
      });

      const command = MsTeamsOauthCallbackCommand.create({
        tenant: 'tenant-xyz',
        adminConsent: 'False',
        state,
      });

      await expect(usecase.execute(command)).to.be.rejectedWith(BadRequestException, 'Admin consent was not granted');
    });

    it('should throw if tenant is missing', async () => {
      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
      });

      const command = MsTeamsOauthCallbackCommand.create({ state });

      await expect(usecase.execute(command)).to.be.rejectedWith(
        BadRequestException,
        'Missing tenant parameter from MS Teams admin consent'
      );
    });
  });

  describe('link_user mode', () => {
    beforeEach(() => {
      axiosPost = sinon.stub(axios, 'post');
    });

    it('should exchange code, extract oid, and create an MS_TEAMS_USER endpoint', async () => {
      const idToken = buildIdToken({ oid: MOCK_AAD_OID, sub: 'sub-123', tid: MOCK_TENANT_ID });
      axiosPost.resolves({ data: { id_token: idToken, access_token: 'at-123' } });

      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
        subscriberId: MOCK_SUBSCRIBER_ID,
        mode: 'link_user',
      });

      createChannelEndpoint.execute.resolves({ identifier: 'ep-xyz' } as any);

      const command = MsTeamsOauthCallbackCommand.create({
        providerCode: 'auth-code-abc',
        state,
      });

      await usecase.execute(command);

      expect(createChannelEndpoint.execute.calledOnce).to.be.true;
      const callArg = createChannelEndpoint.execute.firstCall.args[0];
      expect(callArg.type).to.equal(ENDPOINT_TYPES.MS_TEAMS_USER);
      expect(callArg.endpoint.userId).to.equal(MOCK_AAD_OID);
      expect(callArg.subscriberId).to.equal(MOCK_SUBSCRIBER_ID);
    });

    it('should throw if id_token is missing from token response', async () => {
      axiosPost.resolves({ data: { access_token: 'at-123' } });

      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
        subscriberId: MOCK_SUBSCRIBER_ID,
        mode: 'link_user',
      });

      const command = MsTeamsOauthCallbackCommand.create({
        providerCode: 'auth-code-abc',
        state,
      });

      await expect(usecase.execute(command)).to.be.rejectedWith(BadRequestException, 'missing id_token');
    });

    it('should throw if oid claim is absent from id_token', async () => {
      const idToken = buildIdToken({ sub: 'sub-123', tid: MOCK_TENANT_ID });
      axiosPost.resolves({ data: { id_token: idToken, access_token: 'at-123' } });

      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
        subscriberId: MOCK_SUBSCRIBER_ID,
        mode: 'link_user',
      });

      const command = MsTeamsOauthCallbackCommand.create({
        providerCode: 'auth-code-abc',
        state,
      });

      await expect(usecase.execute(command)).to.be.rejectedWith(BadRequestException, 'missing oid claim');
    });

    it('should throw if subscriberId is absent in link_user mode', async () => {
      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
        mode: 'link_user',
      });

      const command = MsTeamsOauthCallbackCommand.create({
        providerCode: 'auth-code-abc',
        state,
      });

      await expect(usecase.execute(command)).to.be.rejectedWith(
        BadRequestException,
        'subscriberId is required for link_user mode'
      );
    });

    it('should throw if providerCode is missing in link_user mode', async () => {
      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
        subscriberId: MOCK_SUBSCRIBER_ID,
        mode: 'link_user',
      });

      const command = MsTeamsOauthCallbackCommand.create({ state });

      await expect(usecase.execute(command)).to.be.rejectedWith(
        BadRequestException,
        'Missing authorization code for link_user mode'
      );
    });
  });
});
