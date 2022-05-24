import { SubscriberRepository } from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { SharedModule } from '../../../shared/shared.module';
import { DirectIntegrationId, IUpdateSubscriberChannelDto } from '@novu/shared';
import { UpdateSubscriberChannel } from './update-subscriber-channel.usecase';
import { UpdateSubscriberChannelCommand } from './update-subscriber-channel.command';

describe('Update Subscriber channel credentials', function () {
  let updateSubscriberChannelUsecase: UpdateSubscriberChannel;
  let session: UserSession;
  const subscriberRepository = new SubscriberRepository();
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [UpdateSubscriberChannel],
    }).compile();

    session = new UserSession();
    await session.initialize();

    updateSubscriberChannelUsecase = moduleRef.get<UpdateSubscriberChannel>(UpdateSubscriberChannel);
  });

  it('should add subscriber new discord channel credentials', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    const subscriberChannel: IUpdateSubscriberChannelDto = {
      integrationId: DirectIntegrationId.Discord,
      credentials: { accessToken: 'new-super-secret-123', channelId: '#new-general' },
    };
    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        integrationId: subscriberChannel.integrationId,
        credentials: subscriberChannel.credentials,
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const newChannel = updatedSubscriber.channels.find(
      (channel) => channel.integrationId === subscriberChannel.integrationId
    );

    expect(newChannel.credentials.channelId).to.equal(subscriberChannel.credentials.channelId);
    expect(newChannel.credentials.accessToken).to.equal(subscriberChannel.credentials.accessToken);
  });

  it('should update subscriber existing slack channel credentials', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        integrationId: DirectIntegrationId.Discord,
        credentials: { accessToken: '123', channelId: '#general' },
      })
    );

    const newSlackSubscribersChannel: IUpdateSubscriberChannelDto = {
      integrationId: DirectIntegrationId.Slack,
      credentials: { accessToken: 'new-super-secret-123', channelId: '#new-general' },
    };
    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        integrationId: newSlackSubscribersChannel.integrationId,
        credentials: newSlackSubscribersChannel.credentials,
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const newChannel = updatedSubscriber.channels.find(
      (channel) => channel.integrationId === newSlackSubscribersChannel.integrationId
    );

    expect(newChannel.credentials.channelId).to.equal(newSlackSubscribersChannel.credentials.channelId);
    expect(newChannel.credentials.accessToken).to.equal(newSlackSubscribersChannel.credentials.accessToken);
  });
});
