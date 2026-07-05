import { BadRequestException } from '@nestjs/common';
import { CreateOrUpdateSubscriberUseCase } from '@novu/application-generic';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateChannelEndpoint } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { ChatOauthCallbackCommand } from './chat-oauth-callback.command';
import { ChatOauthCallback } from './chat-oauth-callback.usecase';

const MOCK_ENVIRONMENT_ID = '507f1f77bcf86cd799439011';
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

    environmentRepository.getApiKeys.resolves([{ key: MOCK_API_KEY }] as any);
  });

  it('should reject callback without valid OAuth state before loading integration', async () => {
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
      expect(integrationRepository.findOne.called).to.be.false;
    }
  });
});
