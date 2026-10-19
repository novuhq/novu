import { EnvironmentRepository, SubscriberRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { GenerateWebexOauthUrlCommand } from './generate-webex-oauth-url.command';
import { GenerateWebexOauthUrl, WEBEX_DEFAULT_OAUTH_SCOPES } from './generate-webex-oauth-url.usecase';

const MOCK_ENVIRONMENT_ID = 'env-id-123';
const MOCK_ORGANIZATION_ID = 'org-id-456';
const MOCK_API_KEY = 'test-api-key-for-hmac';
const MOCK_CLIENT_ID = 'webex-client-id';
const MOCK_SECRET_KEY = 'webex-secret';
const MOCK_API_ROOT_URL = 'https://api.novu.co';

function buildMockIntegration(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'integration-id',
    _environmentId: MOCK_ENVIRONMENT_ID,
    _organizationId: MOCK_ORGANIZATION_ID,
    identifier: 'webex-integration',
    providerId: ChatProviderIdEnum.WebexMessaging,
    credentials: {
      clientId: MOCK_CLIENT_ID,
      secretKey: MOCK_SECRET_KEY,
    },
    ...overrides,
  } as any;
}

describe('GenerateWebexOauthUrl', () => {
  let usecase: GenerateWebexOauthUrl;
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let subscriberRepository: sinon.SinonStubbedInstance<SubscriberRepository>;
  let createOrUpdateSubscriber: { execute: sinon.SinonStub };
  let originalApiRootUrl: string | undefined;
  let originalAgentApiHostname: string | undefined;

  beforeEach(() => {
    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    subscriberRepository = sinon.createStubInstance(SubscriberRepository);
    createOrUpdateSubscriber = { execute: sinon.stub() };
    usecase = new GenerateWebexOauthUrl(
      environmentRepository as any,
      subscriberRepository as any,
      createOrUpdateSubscriber as any
    );

    originalApiRootUrl = process.env.API_ROOT_URL;
    originalAgentApiHostname = process.env.AGENT_API_HOSTNAME;
    process.env.API_ROOT_URL = MOCK_API_ROOT_URL;
    delete process.env.AGENT_API_HOSTNAME;

    environmentRepository.getApiKeys.resolves([{ key: MOCK_API_KEY } as any]);
    subscriberRepository.findBySubscriberId.resolves({ _id: 'sub-id', subscriberId: 'subscriber-1' } as any);
  });

  afterEach(() => {
    sinon.restore();

    if (originalApiRootUrl === undefined) {
      delete process.env.API_ROOT_URL;
    } else {
      process.env.API_ROOT_URL = originalApiRootUrl;
    }

    if (originalAgentApiHostname === undefined) {
      delete process.env.AGENT_API_HOSTNAME;
    } else {
      process.env.AGENT_API_HOSTNAME = originalAgentApiHostname;
    }
  });

  it('should include all default workspace OAuth scopes required to send Webex messages', async () => {
    const command = GenerateWebexOauthUrlCommand.create({
      environmentId: MOCK_ENVIRONMENT_ID,
      organizationId: MOCK_ORGANIZATION_ID,
      subscriberId: 'subscriber-1',
      integration: buildMockIntegration(),
    });

    const url = await usecase.execute(command);
    const scope = new URL(url).searchParams.get('scope');

    expect(scope?.split(' ')).to.deep.equal([...WEBEX_DEFAULT_OAUTH_SCOPES]);
    expect(scope).to.include('spark:kms');
  });
});
