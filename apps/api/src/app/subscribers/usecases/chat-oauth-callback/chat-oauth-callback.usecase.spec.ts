import { BadRequestException } from '@nestjs/common';
import { CreateOrUpdateSubscriberUseCase } from '@novu/application-generic';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateChannelEndpoint } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { createSubscriberChatOAuthState } from '../chat-oauth/subscriber-chat-oauth-state.util';
import { ChatOauthCallbackCommand } from './chat-oauth-callback.command';
import { ChatOauthCallback } from './chat-oauth-callback.usecase';

const MOCK_ENVIRONMENT_ID = '507f1f77bcf86cd799439011';
const MOCK_ORGANIZATION_ID = '507f1f77bcf86cd799439012';
const MOCK_SUBSCRIBER_ID = 'subscriber-abc';
const MOCK_API_KEY = 'test-api-key';

describe('ChatOauthCallback', () => {
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let createSubscriberUsecase: sinon.SinonStubbedInstance<CreateOrUpdateSubscriberUseCase>;
  let createChannelEndpoint: sinon.SinonStubbedInstance<CreateChannelEndpoint>;
  let usecase: ChatOauthCallback;

  beforeEach(() => {
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    createSubscriberUsecase = sinon.createStubInstance(CreateOrUpdateSubscriberUseCase);
    createChannelEndpoint = sinon.createStubInstance(CreateChannelEndpoint);
    usecase = new ChatOauthCallback(
      integrationRepository as any,
      environmentRepository as any,
      createSubscriberUsecase as any,
      createChannelEndpoint as any
    );

    environmentRepository.findOne.resolves({
      _organizationId: MOCK_ORGANIZATION_ID,
      apiKeys: [{ key: MOCK_API_KEY }],
    } as any);
    integrationRepository.findOne.resolves({
      identifier: 'slack',
      credentials: {
        clientId: 'client-id',
        secretKey: 'secret-key',
      },
    } as any);
  });

  it('should reject callback without valid OAuth state', async () => {
    const command = ChatOauthCallbackCommand.create({
      environmentId: MOCK_ENVIRONMENT_ID,
      subscriberId: MOCK_SUBSCRIBER_ID,
      providerId: ChatProviderIdEnum.Slack,
      providerCode: 'oauth-code',
      state: 'invalid-state',
    });

    try {
      await usecase.execute(command);
      throw new Error('expected OAuth state validation to fail');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect((error as BadRequestException).message).to.equal('Invalid or expired OAuth state parameter');
    }
  });

  it('should reject callback when state subscriber does not match URL subscriber', async () => {
    const state = createSubscriberChatOAuthState(
      {
        environmentId: MOCK_ENVIRONMENT_ID,
        subscriberId: 'attacker-subscriber',
        providerId: ChatProviderIdEnum.Slack,
      },
      MOCK_API_KEY
    );

    const command = ChatOauthCallbackCommand.create({
      environmentId: MOCK_ENVIRONMENT_ID,
      subscriberId: MOCK_SUBSCRIBER_ID,
      providerId: ChatProviderIdEnum.Slack,
      providerCode: 'oauth-code',
      state,
    });

    try {
      await usecase.execute(command);
      throw new Error('expected subscriber mismatch to fail');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect((error as BadRequestException).message).to.equal('Invalid or expired OAuth state parameter');
    }
  });
});
