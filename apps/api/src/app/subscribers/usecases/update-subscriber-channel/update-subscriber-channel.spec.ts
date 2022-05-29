import { SubscriberRepository } from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { SharedModule } from '../../../shared/shared.module';
import { DirectProviderIdEnum, IUpdateSubscriberChannelDto } from '@novu/shared';
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
      providerId: DirectProviderIdEnum.Discord,
      credentials: { accessToken: 'new-super-secret-123', channelId: '#new-general' },
    };
    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: subscriberChannel.providerId,
        credentials: subscriberChannel.credentials,
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const newChannel = updatedSubscriber.channels.find(
      (channel) => channel.providerId === subscriberChannel.providerId
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
        providerId: DirectProviderIdEnum.Discord,
        credentials: { accessToken: '123', channelId: '#general' },
      })
    );

    const newSlackSubscribersChannel: IUpdateSubscriberChannelDto = {
      providerId: DirectProviderIdEnum.Slack,
      credentials: { accessToken: 'new-super-secret-123', channelId: '#new-general' },
    };
    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: newSlackSubscribersChannel.providerId,
        credentials: newSlackSubscribersChannel.credentials,
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const newChannel = updatedSubscriber.channels.find(
      (channel) => channel.providerId === newSlackSubscribersChannel.providerId
    );

    expect(newChannel.credentials.channelId).to.equal(newSlackSubscribersChannel.credentials.channelId);
    expect(newChannel.credentials.accessToken).to.equal(newSlackSubscribersChannel.credentials.accessToken);
  });

  it('should update only token on existing slack channel credentials', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    const newSlackCredentials: IUpdateSubscriberChannelDto = {
      providerId: DirectProviderIdEnum.Slack,
      credentials: { accessToken: 'new-super-secret-123' },
    };

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: newSlackCredentials.providerId,
        credentials: newSlackCredentials.credentials,
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const newChannel = updatedSubscriber.channels.find(
      (channel) => channel.providerId === newSlackCredentials.providerId
    );

    expect(newChannel._integrationId).to.equal('integrationId_slack');
    expect(newChannel.providerId).to.equal('slack');
    expect(newChannel.credentials.channelId).to.equal('#general');
    expect(newChannel.credentials.accessToken).to.equal('new-super-secret-123');
  });

  it('should update only channelId on existing slack channel credentials', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    const newSlackCredentials: IUpdateSubscriberChannelDto = {
      providerId: DirectProviderIdEnum.Slack,
      credentials: { channelId: '@tommy' },
    };

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: newSlackCredentials.providerId,
        credentials: newSlackCredentials.credentials,
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const newChannel = updatedSubscriber.channels.find(
      (channel) => channel.providerId === newSlackCredentials.providerId
    );

    expect(newChannel._integrationId).to.equal('integrationId_slack');
    expect(newChannel.providerId).to.equal('slack');
    expect(newChannel.credentials.channelId).to.equal('@tommy');
    expect(newChannel.credentials.accessToken).to.equal('123');
  });
});
