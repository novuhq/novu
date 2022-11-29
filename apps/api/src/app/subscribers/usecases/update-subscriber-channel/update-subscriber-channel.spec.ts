import { SubscriberRepository } from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { SharedModule } from '../../../shared/shared.module';
import { ChatProviderIdEnum } from '@novu/shared';
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
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const newChannel = updatedSubscriber.channels.find(
      (channel) => channel.providerId === subscriberChannel.providerId
    );

    expect(newChannel.credentials.webhookUrl).to.equal(subscriberChannel.credentials.webhookUrl);
  });

  it('should update subscriber existing slack channel credentials', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: ChatProviderIdEnum.Discord,
        credentials: { webhookUrl: 'webhookUrl' },
      })
    );

    const newSlackSubscribersChannel = {
      providerId: ChatProviderIdEnum.Slack,
      credentials: { webhookUrl: 'webhookUrlNew' },
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

    const updatedChannel = updatedSubscriber.channels.find(
      (channel) => channel.providerId === newSlackSubscribersChannel.providerId
    );

    expect(updatedChannel.credentials.webhookUrl).to.equal(newSlackSubscribersChannel.credentials.webhookUrl);
  });

  it('should update only webhookUrl on existing slack channel credentials', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    const newSlackCredentials = {
      providerId: ChatProviderIdEnum.Slack,
      credentials: { webhookUrl: 'new-secret-webhookUrl' },
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
    expect(newChannel.credentials.webhookUrl).to.equal('new-secret-webhookUrl');
  });
});
