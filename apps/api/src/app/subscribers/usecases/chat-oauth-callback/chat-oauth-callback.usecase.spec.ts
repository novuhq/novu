import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  CreateOrUpdateSubscriberUseCase,
  createHash,
  FeatureFlagsService,
  PinoLogger,
} from '@novu/application-generic';
import { CommunityOrganizationRepository, EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum, LegacySubscriberChatOauthMode } from '@novu/shared';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateChannelEndpoint } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { encodeLegacyChatOauthState } from '../chat-oauth/legacy-chat-oauth-state';
import { ChatOauthCallbackCommand } from './chat-oauth-callback.command';
import { ChatOauthCallback } from './chat-oauth-callback.usecase';

const ENVIRONMENT_ID = '6a6600c7762b9e152a1f6728';
const ORGANIZATION_ID = '6a6600c715029ec38931ec00';
const SUBSCRIBER_ID = 'victim-subscriber';
const API_KEY = 'victim-environment-api-key';
const ATTACKER_WEBHOOK = 'https://hooks.slack.com/services/ATTACKER/WORKSPACE/PWNED';

function buildCommand(overrides: Partial<ChatOauthCallbackCommand> = {}): ChatOauthCallbackCommand {
  return ChatOauthCallbackCommand.create({
    environmentId: ENVIRONMENT_ID,
    subscriberId: SUBSCRIBER_ID,
    providerId: ChatProviderIdEnum.Slack,
    providerCode: 'oauth-code',
    ...overrides,
  });
}

function buildState(overrides: Record<string, unknown> = {}, signingKey = API_KEY): string {
  return encodeLegacyChatOauthState(
    {
      environmentId: ENVIRONMENT_ID,
      subscriberId: SUBSCRIBER_ID,
      providerId: ChatProviderIdEnum.Slack,
      timestamp: Date.now(),
      ...overrides,
    },
    signingKey
  );
}

describe('ChatOauthCallback (deprecated per-subscriber chat OAuth)', () => {
  let usecase: ChatOauthCallback;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let organizationRepository: sinon.SinonStubbedInstance<CommunityOrganizationRepository>;
  let featureFlagsService: { getFlag: sinon.SinonStub };
  let createSubscriber: sinon.SinonStubbedInstance<CreateOrUpdateSubscriberUseCase>;
  let createChannelEndpoint: sinon.SinonStubbedInstance<CreateChannelEndpoint>;

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
    createSubscriber = sinon.createStubInstance(CreateOrUpdateSubscriberUseCase);
    createChannelEndpoint = sinon.createStubInstance(CreateChannelEndpoint);

    environmentRepository.findOne.resolves({
      _id: ENVIRONMENT_ID,
      _organizationId: ORGANIZATION_ID,
      apiKeys: [{ key: API_KEY }],
    } as any);
    environmentRepository.getApiKeys.resolves([{ key: API_KEY } as any]);
    organizationRepository.findOne.resolves({
      _id: ORGANIZATION_ID,
      createdAt: new Date('2020-01-01'),
    } as any);
    stubLegacyMode(LegacySubscriberChatOauthMode.ENABLED);

    stubIntegration({ clientId: 'victim-client-id', secretKey: 'victim-secret' });

    sinon.stub(axios, 'post').resolves({ data: { ok: true, incoming_webhook: { url: ATTACKER_WEBHOOK } } } as any);

    usecase = new ChatOauthCallback(
      integrationRepository as any,
      environmentRepository as any,
      organizationRepository as any,
      featureFlagsService as unknown as FeatureFlagsService,
      createSubscriber as any,
      createChannelEndpoint as any,
      sinon.createStubInstance(PinoLogger) as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('rejects every request when the feature flag defaults to disabled', async () => {
    stubLegacyMode(LegacySubscriberChatOauthMode.DISABLED);

    await expectRejection(usecase.execute(buildCommand()), ForbiddenException);

    expect(createChannelEndpoint.execute.called).to.equal(false);
  });

  it('attaches the endpoint when the state was signed by the target environment', async () => {
    await usecase.execute(buildCommand({ state: buildState({ integrationIdentifier: 'victim-slack' }) }));

    expect(createChannelEndpoint.execute.calledOnce).to.equal(true);
    expect(createChannelEndpoint.execute.firstCall.args[0]).to.include({
      environmentId: ENVIRONMENT_ID,
      subscriberId: SUBSCRIBER_ID,
    });
  });

  it('routes on the signed state rather than the query string', async () => {
    await usecase.execute(
      buildCommand({
        environmentId: 'ffffffffffffffffffffffff',
        integrationIdentifier: 'attacker-supplied',
        state: buildState({ integrationIdentifier: 'victim-slack' }),
      })
    );

    expect(integrationRepository.findOne.firstCall.args[0]).to.include({
      _environmentId: ENVIRONMENT_ID,
      identifier: 'victim-slack',
    });
  });

  it('rejects a state signed with another environment key', async () => {
    await expectRejection(
      usecase.execute(buildCommand({ state: buildState({}, 'attacker-environment-api-key') })),
      BadRequestException
    );

    expect(createChannelEndpoint.execute.called).to.equal(false);
  });

  it('rejects a state minted for a different subscriber', async () => {
    await expectRejection(
      usecase.execute(buildCommand({ state: buildState({ subscriberId: 'someone-else' }) })),
      BadRequestException
    );

    expect(createChannelEndpoint.execute.called).to.equal(false);
  });

  it('completes an HMAC-protected flow using the hash carried in the state', async () => {
    stubIntegration({ clientId: 'victim-client-id', secretKey: 'victim-secret', hmac: true });

    await usecase.execute(
      buildCommand({ state: buildState({ hmacHash: createHash(API_KEY, SUBSCRIBER_ID) as string }) })
    );

    expect(createChannelEndpoint.execute.calledOnce).to.equal(true);
  });

  it('rejects an HMAC-protected flow whose state carries no hash', async () => {
    stubIntegration({ clientId: 'victim-client-id', secretKey: 'victim-secret', hmac: true });

    await expectRejection(usecase.execute(buildCommand({ state: buildState() })), BadRequestException);

    expect(createChannelEndpoint.execute.called).to.equal(false);
  });

  it('still accepts a stateless callback when the flag is enabled', async () => {
    await usecase.execute(buildCommand());

    expect(createChannelEndpoint.execute.calledOnce).to.equal(true);
  });

  it('blocks a stateless cross-tenant callback in hmac_required mode', async () => {
    stubLegacyMode(LegacySubscriberChatOauthMode.HMAC_REQUIRED);

    await expectRejection(usecase.execute(buildCommand()), BadRequestException);

    expect(createChannelEndpoint.execute.called).to.equal(false);
  });
});

async function expectRejection(promise: Promise<unknown>, errorType: unknown) {
  try {
    await promise;
  } catch (error) {
    expect(error).to.be.instanceOf(errorType as never);

    return;
  }

  throw new Error('Expected the promise to reject');
}
