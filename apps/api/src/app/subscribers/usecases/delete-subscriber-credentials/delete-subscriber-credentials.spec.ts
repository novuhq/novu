import { SubscriberRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { SharedModule } from '../../../shared/shared.module';
import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';
import { DeleteSubscriberCredentials } from './delete-subscriber-credentials.usecase';
import { DeleteSubscriberCredentialsCommand } from './delete-subscriber-credentials.command';
import { UpdateSubscriberChannel } from '../update-subscriber-channel/update-subscriber-channel.usecase';
import { UpdateSubscriberChannelCommand } from '../update-subscriber-channel/update-subscriber-channel.command';
import { OAuthHandlerEnum } from '../../types';
import { GetSubscriber } from '../get-subscriber/get-subscriber.usecase';

describe('Delete subscriber provider credentials', function () {
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
  });

  it('should delete subscriber discord provider credentials', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();
    const fcmTokens = ['token1', 'token2'];
    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: ChatProviderIdEnum.Discord,
        credentials: { webhookUrl: 'newWebhookUrl' },
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
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: false,
      })
    );

    let updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    const newDiscordProvider = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === ChatProviderIdEnum.Discord
    );

    expect(newDiscordProvider?.credentials.webhookUrl).to.equal('newWebhookUrl');

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

    const isDiscordProviderDeleted = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === ChatProviderIdEnum.Discord
    );
    const fcmCredentials = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === PushProviderIdEnum.FCM
    );
    expect(isDiscordProviderDeleted).to.equal(undefined);
    expect(fcmCredentials?.credentials.deviceTokens).to.deep.equal(['identifier', ...fcmTokens]);
  });
});
