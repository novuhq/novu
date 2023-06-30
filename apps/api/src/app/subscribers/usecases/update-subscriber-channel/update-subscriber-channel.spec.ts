import { IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { SharedModule } from '../../../shared/shared.module';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { UpdateSubscriberChannel } from './update-subscriber-channel.usecase';
import { UpdateSubscriberChannelCommand } from './update-subscriber-channel.command';
import { OAuthHandlerEnum } from '../../types';

describe('Update Subscriber channel credentials', function () {
  let updateSubscriberChannelUsecase: UpdateSubscriberChannel;
  let session: UserSession;
  const subscriberRepository = new SubscriberRepository();
  const integrationRepository = new IntegrationRepository();

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
        oauthHandler: OAuthHandlerEnum.NOVU,
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const newChannel = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === subscriberChannel.providerId
    );

    expect(newChannel?.credentials.webhookUrl).to.equal(subscriberChannel.credentials.webhookUrl);
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
        oauthHandler: OAuthHandlerEnum.NOVU,
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
        oauthHandler: OAuthHandlerEnum.NOVU,
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const updatedChannel = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === newSlackSubscribersChannel.providerId
    );

    expect(updatedChannel?.credentials.webhookUrl).to.equal(newSlackSubscribersChannel.credentials.webhookUrl);
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
        oauthHandler: OAuthHandlerEnum.NOVU,
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const newChannel = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === newSlackCredentials.providerId
    );

    expect(newChannel?._integrationId).to.equal('integrationId_slack');
    expect(newChannel?.providerId).to.equal('slack');
    expect(newChannel?.credentials.webhookUrl).to.equal('new-secret-webhookUrl');
  });

  it('should update slack channel credentials for a specific integration', async function () {
    const identifier = 'identifier_slack';
    const webhookUrl = 'webhookUrl';
    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      identifier,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      credentials: {},
      active: true,
    });
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        integrationIdentifier: identifier,
        providerId: ChatProviderIdEnum.Slack,
        credentials: { webhookUrl },
        oauthHandler: OAuthHandlerEnum.NOVU,
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(subscriber._id);

    const updatedChannel = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === ChatProviderIdEnum.Slack && channel._integrationId === integration._id
    );

    expect(updatedChannel?.credentials.webhookUrl).to.equal(webhookUrl);
  });
});
