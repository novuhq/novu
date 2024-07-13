import { SubscriberRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { SharedModule } from '../../../shared/shared.module';
import { ChannelTypeEnum, ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';
import { DeleteSubscriberCredentials } from './delete-subscriber-credentials.usecase';
import { DeleteSubscriberCredentialsCommand } from './delete-subscriber-credentials.command';
import { GetSubscriber } from '../get-subscriber/get-subscriber.usecase';
import { OAuthHandlerEnum, UpdateSubscriberChannel, UpdateSubscriberChannelCommand } from '@novu/application-generic';
import { CreateIntegration } from '../../../integrations/usecases/create-integration/create-integration.usecase';
import { CreateIntegrationCommand } from '../../../integrations/usecases/create-integration/create-integration.command';

describe('Delete subscriber provider credentials', function () {
  let createIntegrationUseCase: CreateIntegration;
  let updateSubscriberChannelUsecase: UpdateSubscriberChannel;
  let deleteSubscriberCredentialsUsecase: DeleteSubscriberCredentials;
  let session: UserSession;
  const subscriberRepository = new SubscriberRepository();
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [DeleteSubscriberCredentials, UpdateSubscriberChannel, GetSubscriber],
    }).compile();

    session = new UserSession();
    await session.initialize();

    updateSubscriberChannelUsecase = moduleRef.get<UpdateSubscriberChannel>(UpdateSubscriberChannel);
    deleteSubscriberCredentialsUsecase = moduleRef.get<DeleteSubscriberCredentials>(DeleteSubscriberCredentials);
    createIntegrationUseCase = moduleRef.get<CreateIntegration>(CreateIntegration);
  });

  it('should delete subscriber discord provider credentials', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();
    const fcmTokens = ['token1', 'token2'];

    const firstDiscordIntegration = await createIntegrationUseCase.execute(
      CreateIntegrationCommand.create({
        organizationId: subscriber._organizationId,
        environmentId: session.environment._id,
        channel: ChannelTypeEnum.CHAT,
        credentials: {},
        providerId: ChatProviderIdEnum.Discord,
        active: true,
        check: false,
        userId: session.user._id,
      })
    );

    const secondDiscordIntegration = await createIntegrationUseCase.execute(
      CreateIntegrationCommand.create({
        organizationId: subscriber._organizationId,
        environmentId: session.environment._id,
        channel: ChannelTypeEnum.CHAT,
        credentials: {},
        providerId: ChatProviderIdEnum.Discord,
        active: true,
        check: false,
        userId: session.user._id,
      })
    );

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: ChatProviderIdEnum.Discord,
        credentials: { webhookUrl: 'newWebhookUrl' },
        integrationIdentifier: firstDiscordIntegration.identifier,
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: false,
      })
    );

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: ChatProviderIdEnum.Discord,
        credentials: { webhookUrl: 'newWebhookUrl' },
        integrationIdentifier: secondDiscordIntegration.identifier,
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: false,
      })
    );

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: PushProviderIdEnum.FCM,
        credentials: { deviceTokens: fcmTokens },
        integrationIdentifier: 'fcm-integration-1',
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: false,
      })
    );

    let updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    const newDiscordProviders = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === ChatProviderIdEnum.Discord
    );

    expect(newDiscordProviders).length.to.equal(2);

    await deleteSubscriberCredentialsUsecase.execute(
      DeleteSubscriberCredentialsCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: ChatProviderIdEnum.Discord,
      })
    );

    updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    const areDiscordProviderIntegrationsDeleted = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === ChatProviderIdEnum.Discord
    );
    const fcmCredentials = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === PushProviderIdEnum.FCM
    );
    expect(areDiscordProviderIntegrationsDeleted).to.equal(undefined);
    expect(fcmCredentials?.credentials.deviceTokens).to.deep.equal(['identifier', ...fcmTokens]);
  });
});
