import { SubscriberRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { SharedModule } from '../../../shared/shared.module';
import { ChatProviderIdEnum } from '@novu/shared';
import { DeleteSubscriberCredentials } from './delete-subscriber-credentials.usecase';
import { DeleteSubscriberCredentialsCommand } from './delete-subscriber-credentials.command';
import { UpdateSubscriberChannel } from '../update-subscriber-channel/update-subscriber-channel.usecase';
import { UpdateSubscriberChannelCommand } from '../update-subscriber-channel/update-subscriber-channel.command';
import { OAuthHandlerEnum } from '../../types';

describe('Update subscriber provider credentials', function () {
  let updateSubscriberChannelUsecase: UpdateSubscriberChannel;
  let deleteSubscriberCredentialsUsecase: DeleteSubscriberCredentials;
  let session: UserSession;
  const subscriberRepository = new SubscriberRepository();
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [DeleteSubscriberCredentials, UpdateSubscriberChannel],
    }).compile();

    session = new UserSession();
    await session.initialize();

    updateSubscriberChannelUsecase = moduleRef.get<UpdateSubscriberChannel>(UpdateSubscriberChannel);
    deleteSubscriberCredentialsUsecase = moduleRef.get<DeleteSubscriberCredentials>(DeleteSubscriberCredentials);
  });

  it('should delete subscriber discord provider credentials', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    const subscriberChannel = {
      providerId: ChatProviderIdEnum.Discord,
      credentials: { webhookUrl: 'newWebhookUrl' },
    };
    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: subscriberChannel.providerId,
        credentials: subscriberChannel.credentials,
        oauthHandler: OAuthHandlerEnum.NOVU,
      })
    );

    let updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const newProvider = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === subscriberChannel.providerId
    );

    expect(newProvider?.credentials.webhookUrl).to.equal(subscriberChannel.credentials.webhookUrl);

    await deleteSubscriberCredentialsUsecase.execute(
      DeleteSubscriberCredentialsCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: ChatProviderIdEnum.Discord,
      })
    );

    updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const isDiscordProviderDeleted = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === ChatProviderIdEnum.Discord
    );
    expect(isDiscordProviderDeleted).to.equal(undefined);
  });
});
