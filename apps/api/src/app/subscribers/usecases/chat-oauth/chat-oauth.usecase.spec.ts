import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createHash, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { CommunityOrganizationRepository, EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum, LegacySubscriberChatOauthMode } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ChatOauthCommand } from './chat-oauth.command';
import { ChatOauth } from './chat-oauth.usecase';
import { decodeLegacyChatOauthState } from './legacy-chat-oauth-state';

const ENVIRONMENT_ID = '6a6600c7762b9e152a1f6728';
const ORGANIZATION_ID = '6a6600c715029ec38931ec00';
const SUBSCRIBER_ID = 'victim-subscriber';
const API_KEY = 'victim-environment-api-key';
const CLIENT_ID = 'victim-slack-client-id';

function buildCommand(overrides: Partial<ChatOauthCommand> = {}): ChatOauthCommand {
  return ChatOauthCommand.create({
    environmentId: ENVIRONMENT_ID,
    subscriberId: SUBSCRIBER_ID,
    providerId: ChatProviderIdEnum.Slack,
    ...overrides,
  });
}

describe('ChatOauth (deprecated per-subscriber chat OAuth)', () => {
  let usecase: ChatOauth;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let organizationRepository: sinon.SinonStubbedInstance<CommunityOrganizationRepository>;
  let featureFlagsService: { getFlag: sinon.SinonStub };

  function stubIntegration(credentials: Record<string, unknown>) {
    integrationRepository.findOne.resolves({
      _id: 'integration-id',
      _environmentId: ENVIRONMENT_ID,
      _organizationId: ORGANIZATION_ID,
      identifier: 'victim-slack',
      providerId: ChatProviderIdEnum.Slack,
      credentials,
    } as any);
  }

  function stubLegacyMode(mode: LegacySubscriberChatOauthMode) {
    featureFlagsService.getFlag.resolves(mode);
  }

  beforeEach(() => {
    process.env.API_ROOT_URL = 'https://api.novu.co';

    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    organizationRepository = sinon.createStubInstance(CommunityOrganizationRepository);
    featureFlagsService = { getFlag: sinon.stub() };

    environmentRepository.findOne.resolves({
      _id: ENVIRONMENT_ID,
      _organizationId: ORGANIZATION_ID,
    } as any);
    environmentRepository.getApiKeys.resolves([{ key: API_KEY } as any]);
    organizationRepository.findOne.resolves({
      _id: ORGANIZATION_ID,
      createdAt: new Date('2020-01-01'),
    } as any);
    stubLegacyMode(LegacySubscriberChatOauthMode.ENABLED);

    usecase = new ChatOauth(
      integrationRepository as any,
      environmentRepository as any,
      organizationRepository as any,
      featureFlagsService as unknown as FeatureFlagsService,
      sinon.createStubInstance(PinoLogger) as any
    );

    stubIntegration({ clientId: CLIENT_ID, secretKey: 'victim-secret' });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('rejects every request when the feature flag defaults to disabled', async () => {
    stubLegacyMode(LegacySubscriberChatOauthMode.DISABLED);

    await expectRejection(usecase.execute(buildCommand()), ForbiddenException);
  });

  it('mints an authorization URL carrying a state signed with the environment key', async () => {
    const url = await usecase.execute(buildCommand({ integrationIdentifier: 'victim-slack' }));

    expect(url).to.include(`client_id=${CLIENT_ID}`);

    const state = new URL(url).searchParams.get('state') as string;
    const decoded = decodeLegacyChatOauthState(state, API_KEY);

    expect(decoded.environmentId).to.equal(ENVIRONMENT_ID);
    expect(decoded.subscriberId).to.equal(SUBSCRIBER_ID);
    expect(decoded.integrationIdentifier).to.equal('victim-slack');
  });

  it('carries the validated HMAC hash in the state so it survives the provider round trip', async () => {
    stubIntegration({ clientId: CLIENT_ID, hmac: true });
    const hmacHash = createHash(API_KEY, SUBSCRIBER_ID) as string;

    const url = await usecase.execute(buildCommand({ hmacHash }));
    const state = new URL(url).searchParams.get('state') as string;

    expect(decodeLegacyChatOauthState(state, API_KEY).hmacHash).to.equal(hmacHash);
  });

  it('rejects a wrong HMAC hash when the integration enables HMAC', async () => {
    stubIntegration({ clientId: CLIENT_ID, hmac: true });

    await expectRejection(usecase.execute(buildCommand({ hmacHash: 'not-the-right-hash' })), BadRequestException);
  });

  it('does not require an HMAC hash when the flag is enabled and the integration does not opt in', async () => {
    const url = await usecase.execute(buildCommand());

    expect(url).to.include('slack.com/oauth');
  });

  it('requires an HMAC hash in hmac_required mode even when the integration does not opt in', async () => {
    stubLegacyMode(LegacySubscriberChatOauthMode.HMAC_REQUIRED);

    await expectRejection(usecase.execute(buildCommand()), BadRequestException);

    const url = await usecase.execute(buildCommand({ hmacHash: createHash(API_KEY, SUBSCRIBER_ID) as string }));
    expect(url).to.include('slack.com/oauth');
  });

  it('reports a missing environment and a missing integration identically', async () => {
    integrationRepository.findOne.resolves(null);

    await expectRejection(usecase.execute(buildCommand()), NotFoundException, 'Chat integration not found');
  });
});

async function expectRejection(promise: Promise<unknown>, errorType: unknown, messageIncludes?: string) {
  try {
    await promise;
  } catch (error) {
    expect(error).to.be.instanceOf(errorType as never);

    if (messageIncludes) {
      expect((error as Error).message).to.include(messageIncludes);
    }

    return;
  }

  throw new Error('Expected the promise to reject');
}
