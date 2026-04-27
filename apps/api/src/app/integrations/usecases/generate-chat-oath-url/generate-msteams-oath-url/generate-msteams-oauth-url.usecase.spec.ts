import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository, SubscriberRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { GenerateMsTeamsOauthUrlCommand } from './generate-msteams-oauth-url.command';
import { GenerateMsTeamsOauthUrl, MS_TEAMS_LINK_USER_OAUTH_SCOPES } from './generate-msteams-oauth-url.usecase';

const MOCK_ENVIRONMENT_ID = 'env-id-123';
const MOCK_ORGANIZATION_ID = 'org-id-456';
const MOCK_API_KEY = 'test-api-key-for-hmac';
const MOCK_CLIENT_ID = 'azure-client-id';
const MOCK_TENANT_ID = 'azure-tenant-id';
const MOCK_SECRET_KEY = 'azure-secret';
const MOCK_API_ROOT_URL = 'https://api.novu.co';

function buildMockIntegration(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'integration-id',
    _environmentId: MOCK_ENVIRONMENT_ID,
    _organizationId: MOCK_ORGANIZATION_ID,
    identifier: 'msteams-integration',
    providerId: ChatProviderIdEnum.MsTeams,
    credentials: {
      clientId: MOCK_CLIENT_ID,
      secretKey: MOCK_SECRET_KEY,
      tenantId: MOCK_TENANT_ID,
    },
    ...overrides,
  } as any;
}

describe('GenerateMsTeamsOauthUrl', () => {
  let usecase: GenerateMsTeamsOauthUrl;
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let subscriberRepository: sinon.SinonStubbedInstance<SubscriberRepository>;
  let originalApiRootUrl: string | undefined;

  beforeEach(() => {
    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    subscriberRepository = sinon.createStubInstance(SubscriberRepository);
    usecase = new GenerateMsTeamsOauthUrl(environmentRepository as any, subscriberRepository as any);

    originalApiRootUrl = process.env.API_ROOT_URL;
    process.env.API_ROOT_URL = MOCK_API_ROOT_URL;

    environmentRepository.getApiKeys.resolves([{ key: MOCK_API_KEY } as any]);
    subscriberRepository.findOne.resolves({ _id: 'sub-id', subscriberId: 'subscriber-1' } as any);
  });

  afterEach(() => {
    sinon.restore();
    process.env.API_ROOT_URL = originalApiRootUrl;
  });

  describe('connect mode (admin consent)', () => {
    it('should return an admin consent URL when mode is not set', async () => {
      const command = GenerateMsTeamsOauthUrlCommand.create({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        subscriberId: 'subscriber-1',
        integration: buildMockIntegration(),
      });

      const url = await usecase.execute(command);

      expect(url).to.include('login.microsoftonline.com/organizations/v2.0/adminconsent');
      expect(url).to.include(`client_id=${MOCK_CLIENT_ID}`);
      expect(url).to.include('scope=https%3A%2F%2Fgraph.microsoft.com%2F.default');
    });

    it('should throw if subscriberId and context are both missing', async () => {
      const command = GenerateMsTeamsOauthUrlCommand.create({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        integration: buildMockIntegration(),
      });

      try {
        await usecase.execute(command);
        expect.fail('Expected BadRequestException but none was thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
        expect((err as BadRequestException).message).to.equal('Either subscriberId or context must be provided');
      }
    });
  });

  describe('link_user mode', () => {
    it('should return a delegated OAuth authorize URL', async () => {
      const command = GenerateMsTeamsOauthUrlCommand.create({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        subscriberId: 'subscriber-1',
        integration: buildMockIntegration(),
        mode: 'link_user',
      });

      const url = await usecase.execute(command);

      expect(url).to.include(`login.microsoftonline.com/${MOCK_TENANT_ID}/oauth2/v2.0/authorize`);
      expect(url).to.include(`client_id=${MOCK_CLIENT_ID}`);
      expect(url).to.include('response_type=code');
      expect(url).to.include('response_mode=query');
    });

    it('should request the correct User.Read scopes', async () => {
      const command = GenerateMsTeamsOauthUrlCommand.create({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        subscriberId: 'subscriber-1',
        integration: buildMockIntegration(),
        mode: 'link_user',
      });

      const url = await usecase.execute(command);
      const decodedUrl = decodeURIComponent(url);

      for (const scope of MS_TEAMS_LINK_USER_OAUTH_SCOPES) {
        expect(decodedUrl).to.include(scope);
      }
    });

    it('should throw BadRequestException when only context is provided (no subscriberId) for link_user mode', async () => {
      const command = GenerateMsTeamsOauthUrlCommand.create({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        context: { workflowId: 'wf-1', stepId: 'step-1' } as any,
        integration: buildMockIntegration(),
        mode: 'link_user',
      });

      try {
        await usecase.execute(command);
        expect.fail('Expected BadRequestException but none was thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestException);
        expect((err as BadRequestException).message).to.equal('subscriberId is required for link_user mode');
      }
    });

    it('should throw NotFoundException when tenantId is missing for link_user mode', async () => {
      const command = GenerateMsTeamsOauthUrlCommand.create({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        subscriberId: 'subscriber-1',
        integration: buildMockIntegration({ credentials: { clientId: MOCK_CLIENT_ID, secretKey: MOCK_SECRET_KEY } }),
        mode: 'link_user',
      });

      try {
        await usecase.execute(command);
        expect.fail('Expected NotFoundException but none was thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
        expect((err as NotFoundException).message).to.equal('MS Teams integration missing tenantId');
      }
    });

    it('should encode mode in the OAuth state so the callback can branch correctly', async () => {
      const command = GenerateMsTeamsOauthUrlCommand.create({
        environmentId: MOCK_ENVIRONMENT_ID,
        organizationId: MOCK_ORGANIZATION_ID,
        subscriberId: 'subscriber-1',
        integration: buildMockIntegration(),
        mode: 'link_user',
      });

      const url = await usecase.execute(command);
      const parsed = new URL(url);
      const rawState = parsed.searchParams.get('state');

      expect(rawState).to.not.be.null;

      // State is base64url(jsonPayload.hexSignature); decode then split on last dot
      const decoded = Buffer.from(rawState as string, 'base64url').toString('utf-8');
      const lastDot = decoded.lastIndexOf('.');
      const payloadStr = decoded.slice(0, lastDot);
      const payload = JSON.parse(payloadStr);

      expect(payload.mode).to.equal('link_user');
    });
  });
});
