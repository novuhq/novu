import { BadRequestException } from '@nestjs/common';
import { MsTeamsTokenService } from '@novu/application-generic';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import axios from 'axios';
import { expect } from 'chai';
import { createHmac } from 'crypto';
import sinon from 'sinon';
import { CreateChannelConnection } from '../../../../channel-connections/usecases/create-channel-connection/create-channel-connection.usecase';
import { CreateChannelEndpoint } from '../../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { encodeOAuthState } from '../../generate-chat-oath-url/chat-oauth-state.util';
import { GenerateMsTeamsOauthUrl } from '../../generate-chat-oath-url/generate-msteams-oath-url/generate-msteams-oauth-url.usecase';
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
  let msTeamsTokenService: sinon.SinonStubbedInstance<MsTeamsTokenService>;
  let generateMsTeamsOauthUrl: sinon.SinonStubbedInstance<GenerateMsTeamsOauthUrl>;
  let axiosPost: sinon.SinonStub;
  let axiosGet: sinon.SinonStub;
  let originalApiRootUrl: string | undefined;

  beforeEach(() => {
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    createChannelConnection = sinon.createStubInstance(CreateChannelConnection);
    createChannelEndpoint = sinon.createStubInstance(CreateChannelEndpoint);
    msTeamsTokenService = sinon.createStubInstance(MsTeamsTokenService);
    generateMsTeamsOauthUrl = sinon.createStubInstance(GenerateMsTeamsOauthUrl);

    const logger = { setContext: sinon.stub(), info: sinon.stub(), error: sinon.stub(), warn: sinon.stub() };

    usecase = new MsTeamsOauthCallback(
      integrationRepository as any,
      environmentRepository as any,
      createChannelConnection as any,
      createChannelEndpoint as any,
      msTeamsTokenService as any,
      logger as any,
      generateMsTeamsOauthUrl as any
    );

    originalApiRootUrl = process.env.API_ROOT_URL;
    Reflect.set(process.env, 'API_ROOT_URL', MOCK_API_ROOT_URL);

    environmentRepository.findOne.resolves({
      _id: MOCK_ENVIRONMENT_ID,
      apiKeys: [{ key: MOCK_API_KEY }],
    } as any);

    integrationRepository.findOne.resolves(buildMockIntegration());
  });

  afterEach(() => {
    sinon.restore();

    if (originalApiRootUrl === undefined) {
      Reflect.deleteProperty(process.env, 'API_ROOT_URL');
    } else {
      Reflect.set(process.env, 'API_ROOT_URL', originalApiRootUrl);
    }
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

      try {
        await usecase.execute(command);
        expect.fail('Expected BadRequestException but none was thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
        expect((err as BadRequestException).message).to.equal('Admin consent was not granted');
      }
    });

    it('should chain a link_user redirect when autoLinkUser=true and subscriberId are present in the state', async () => {
      const MOCK_LINK_USER_URL = 'https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize?link_user=1';

      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
        subscriberId: MOCK_SUBSCRIBER_ID,
        autoLinkUser: true,
      });

      createChannelConnection.execute.resolves({ identifier: 'conn-abc' } as any);
      generateMsTeamsOauthUrl.execute.resolves(MOCK_LINK_USER_URL);

      const command = MsTeamsOauthCallbackCommand.create({
        tenant: 'tenant-xyz',
        adminConsent: 'True',
        state,
      });

      const result = await usecase.execute(command);

      expect(createChannelConnection.execute.calledOnce).to.be.true;
      expect(generateMsTeamsOauthUrl.execute.calledOnce).to.be.true;
      const generateCallArg = generateMsTeamsOauthUrl.execute.firstCall.args[0];
      expect(generateCallArg.mode).to.equal('link_user');
      expect(generateCallArg.subscriberId).to.equal(MOCK_SUBSCRIBER_ID);
      expect(result.result).to.equal(MOCK_LINK_USER_URL);
    });

    it('should fall through to close-tab when subscriberId is absent', async () => {
      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
        autoLinkUser: true,
      });

      createChannelConnection.execute.resolves({ identifier: 'conn-abc' } as any);

      const command = MsTeamsOauthCallbackCommand.create({
        tenant: 'tenant-xyz',
        adminConsent: 'True',
        state,
      });

      const result = await usecase.execute(command);

      expect(generateMsTeamsOauthUrl.execute.called).to.be.false;
      expect(result.result).to.include('window.close()');
    });

    it('should fall through to close-tab when autoLinkUser=false even if subscriberId is present', async () => {
      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
        subscriberId: MOCK_SUBSCRIBER_ID,
        autoLinkUser: false,
      });

      createChannelConnection.execute.resolves({ identifier: 'conn-abc' } as any);

      const command = MsTeamsOauthCallbackCommand.create({
        tenant: 'tenant-xyz',
        adminConsent: 'True',
        state,
      });

      const result = await usecase.execute(command);

      expect(generateMsTeamsOauthUrl.execute.called).to.be.false;
      expect(result.result).to.include('window.close()');
    });

    it('should fall through to close-tab when autoLinkUser is absent (raw API callers default to false)', async () => {
      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
        subscriberId: MOCK_SUBSCRIBER_ID,
      });

      createChannelConnection.execute.resolves({ identifier: 'conn-abc' } as any);

      const command = MsTeamsOauthCallbackCommand.create({
        tenant: 'tenant-xyz',
        adminConsent: 'True',
        state,
      });

      const result = await usecase.execute(command);

      expect(generateMsTeamsOauthUrl.execute.called).to.be.false;
      expect(result.result).to.include('window.close()');
    });

    it('should fall through to close-tab and not throw when link_user chaining fails', async () => {
      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
        subscriberId: MOCK_SUBSCRIBER_ID,
        autoLinkUser: true,
      });

      createChannelConnection.execute.resolves({ identifier: 'conn-abc' } as any);
      generateMsTeamsOauthUrl.execute.rejects(new Error('Subscriber not found'));

      const command = MsTeamsOauthCallbackCommand.create({
        tenant: 'tenant-xyz',
        adminConsent: 'True',
        state,
      });

      const result = await usecase.execute(command);

      expect(result.result).to.include('window.close()');
    });

    it('should throw if tenant is missing', async () => {
      const state = buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
      });

      const command = MsTeamsOauthCallbackCommand.create({ state });

      try {
        await usecase.execute(command);
        expect.fail('Expected BadRequestException but none was thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
        expect((err as BadRequestException).message).to.equal('Missing tenant parameter from MS Teams admin consent');
      }
    });
  });

  describe('link_user mode', () => {
    beforeEach(() => {
      axiosPost = sinon.stub(axios, 'post');
      axiosGet = sinon.stub(axios, 'get');
    });

    function buildLinkUserState(overrides: Record<string, unknown> = {}) {
      return buildEncodedState({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.MsTeams,
        subscriberId: MOCK_SUBSCRIBER_ID,
        mode: 'link_user',
        ...overrides,
      });
    }

    function stubTokenExchange() {
      const idToken = buildIdToken({ oid: MOCK_AAD_OID, sub: 'sub-123', tid: MOCK_TENANT_ID });
      axiosPost.onFirstCall().resolves({ data: { id_token: idToken, access_token: 'at-123' } });
    }

    function stubBotInstall() {
      msTeamsTokenService.getGraphToken.resolves('graph-token-123');
      axiosGet.resolves({ data: { value: [{ id: 'teams-app-id-123' }] } });
      axiosPost.onSecondCall().resolves({});
    }

    it('should exchange code, install the bot, and create an MS_TEAMS_USER endpoint on success', async () => {
      stubTokenExchange();
      stubBotInstall();
      createChannelEndpoint.execute.resolves({ identifier: 'ep-xyz' } as any);

      const command = MsTeamsOauthCallbackCommand.create({
        providerCode: 'auth-code-abc',
        state: buildLinkUserState(),
      });

      await usecase.execute(command);

      expect(msTeamsTokenService.getGraphToken.calledOnceWith(MOCK_CLIENT_ID, MOCK_SECRET_KEY, MOCK_TENANT_ID)).to.be
        .true;
      expect(axiosGet.calledOnce).to.be.true;
      expect(axiosPost.callCount).to.equal(2);

      expect(createChannelEndpoint.execute.calledOnce).to.be.true;
      const callArg = createChannelEndpoint.execute.firstCall.args[0];
      expect(callArg.type).to.equal(ENDPOINT_TYPES.MS_TEAMS_USER);
      expect((callArg.endpoint as { userId: string }).userId).to.equal(MOCK_AAD_OID);
      expect(callArg.subscriberId).to.equal(MOCK_SUBSCRIBER_ID);
    });

    it('should throw if subscriberId is absent in link_user mode', async () => {
      const state = buildLinkUserState({ subscriberId: undefined });

      const command = MsTeamsOauthCallbackCommand.create({
        providerCode: 'auth-code-abc',
        state,
      });

      try {
        await usecase.execute(command);
        expect.fail('Expected an error');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
        expect((err as BadRequestException).message).to.include('subscriberId is required for link_user mode');
      }
    });

    it('should throw if providerCode is missing in link_user mode', async () => {
      const command = MsTeamsOauthCallbackCommand.create({ state: buildLinkUserState() });

      try {
        await usecase.execute(command);
        expect.fail('Expected an error');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
        expect((err as BadRequestException).message).to.include('Missing authorization code for link_user mode');
      }
    });

    it('should throw if id_token is missing from token response', async () => {
      axiosPost.onFirstCall().resolves({ data: { access_token: 'at-123' } });

      const command = MsTeamsOauthCallbackCommand.create({
        providerCode: 'auth-code-abc',
        state: buildLinkUserState(),
      });

      try {
        await usecase.execute(command);
        expect.fail('Expected an error');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
        expect((err as BadRequestException).message).to.include('missing id_token');
      }
    });

    it('should throw if oid claim is absent from id_token', async () => {
      const idToken = buildIdToken({ sub: 'sub-123', tid: MOCK_TENANT_ID });
      axiosPost.onFirstCall().resolves({ data: { id_token: idToken, access_token: 'at-123' } });

      const command = MsTeamsOauthCallbackCommand.create({
        providerCode: 'auth-code-abc',
        state: buildLinkUserState(),
      });

      try {
        await usecase.execute(command);
        expect.fail('Expected an error');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
        expect((err as BadRequestException).message).to.include('oid claim');
      }
    });
  });
});
