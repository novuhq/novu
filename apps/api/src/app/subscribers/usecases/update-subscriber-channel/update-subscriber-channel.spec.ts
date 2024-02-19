import { IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { SharedModule } from '../../../shared/shared.module';
import { ChannelTypeEnum, ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';
import { UpdateSubscriberChannel } from './update-subscriber-channel.usecase';
import { UpdateSubscriberChannelCommand } from './update-subscriber-channel.command';
import { OAuthHandlerEnum } from '../../types';
import { faker } from '@faker-js/faker';

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
        isIdempotentOperation: true,
      })
    );

    const updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

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
        isIdempotentOperation: true,
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
        isIdempotentOperation: true,
      })
    );

    const updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    const updatedChannel = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === newSlackSubscribersChannel.providerId
    );

    expect(updatedChannel?.credentials.webhookUrl).to.equal(newSlackSubscribersChannel.credentials.webhookUrl);
  });

  it('should update only webhookUrl on existing slack channel credentials', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();
    const slackIntegration = await integrationRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Slack,
    });

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
        isIdempotentOperation: true,
      })
    );

    const updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    const newChannel = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === newSlackCredentials.providerId
    );

    expect(newChannel?._integrationId).to.equal(slackIntegration?._id);
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
        isIdempotentOperation: true,
      })
    );

    const updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    const updatedChannel = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === ChatProviderIdEnum.Slack && channel._integrationId === integration._id
    );

    expect(updatedChannel?.credentials.webhookUrl).to.equal(webhookUrl);
  });

  it('should not add duplicated token when the operation IS idempotent', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    const fcmCredentials = {
      providerId: PushProviderIdEnum.FCM,
      credentials: { deviceTokens: ['token_1', 'token_1'] },
    };

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: fcmCredentials.providerId,
        credentials: fcmCredentials.credentials,
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: true,
      })
    );

    let updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    const addedFcmToken = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === fcmCredentials.providerId
    );

    expect(addedFcmToken?.providerId).to.equal(PushProviderIdEnum.FCM);
    expect(addedFcmToken?.credentials?.deviceTokens?.length).to.equal(1);
    expect(addedFcmToken?.credentials?.deviceTokens).to.deep.equal(['token_1']);
  });

  it('should not add duplicated token when the operation IS NOT idempotent', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    const fcmCredentials = {
      providerId: PushProviderIdEnum.FCM,
      credentials: { deviceTokens: ['token_1', 'token_1'] },
    };

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: fcmCredentials.providerId,
        credentials: fcmCredentials.credentials,
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: false,
      })
    );

    let updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    const addedFcmToken = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === fcmCredentials.providerId
    );

    expect(addedFcmToken?.providerId).to.equal(PushProviderIdEnum.FCM);
    expect(addedFcmToken?.credentials?.deviceTokens?.length).to.equal(2);
    expect(addedFcmToken?.credentials?.deviceTokens).to.deep.equal(['identifier', 'token_1']);
  });

  it('should append to existing device token array when the operation IS NOT idempotent', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    const fcmCredentials = {
      providerId: PushProviderIdEnum.FCM,
      credentials: { deviceTokens: ['token_1'] },
    };

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: fcmCredentials.providerId,
        credentials: fcmCredentials.credentials,
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: false,
      })
    );

    let updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    const addedFcmToken = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === fcmCredentials.providerId
    );

    expect(addedFcmToken?.providerId).to.equal(PushProviderIdEnum.FCM);
    expect(addedFcmToken?.credentials?.deviceTokens?.length).to.equal(2);
    expect(addedFcmToken?.credentials?.deviceTokens).to.deep.equal(['identifier', 'token_1']);
  });

  it('should update deviceTokens with empty array', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    const fcmCredentials = {
      providerId: PushProviderIdEnum.FCM,
      credentials: { deviceTokens: ['token_1'] },
    };

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: fcmCredentials.providerId,
        credentials: fcmCredentials.credentials,
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: true,
      })
    );

    let updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    const addedFcmToken = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === fcmCredentials.providerId
    );

    expect(addedFcmToken?.credentials?.deviceTokens?.length).to.equal(1);
    expect(addedFcmToken?.credentials?.deviceTokens).to.deep.equal(['token_1']);

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: fcmCredentials.providerId,
        credentials: { deviceTokens: [] },
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: true,
      })
    );

    updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    const updatedProviderWithEmptyDeviceToken = updatedSubscriber?.channels?.find(
      (channel) => channel.providerId === fcmCredentials.providerId
    );

    expect(updatedProviderWithEmptyDeviceToken?.credentials?.deviceTokens?.length).to.equal(0);
    expect(updatedProviderWithEmptyDeviceToken?.credentials?.deviceTokens).to.deep.equal([]);
  });

  it('should update deviceTokens with new token after stress adding', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: PushProviderIdEnum.FCM,
        credentials: { deviceTokens: ['token_1'] },
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: true,
      })
    );

    let updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    let updateToken = updatedSubscriber?.channels?.find((channel) => channel.providerId === PushProviderIdEnum.FCM);

    expect(updateToken?.credentials?.deviceTokens?.length).to.equal(1);
    expect(updateToken?.credentials?.deviceTokens).to.deep.equal(['token_1']);

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: PushProviderIdEnum.FCM,
        credentials: { deviceTokens: ['token_1', 'token_2', 'token_2', 'token_3'] },
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: true,
      })
    );

    updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    updateToken = updatedSubscriber?.channels?.find((channel) => channel.providerId === PushProviderIdEnum.FCM);

    expect(updateToken?.credentials?.deviceTokens?.length).to.equal(3);
    expect(updateToken?.credentials?.deviceTokens).to.deep.equal(['token_1', 'token_2', 'token_3']);

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        providerId: PushProviderIdEnum.FCM,
        credentials: { deviceTokens: ['token_555'] },
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: true,
      })
    );

    updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });

    updateToken = updatedSubscriber?.channels?.find((channel) => channel.providerId === PushProviderIdEnum.FCM);

    expect(updateToken?.credentials?.deviceTokens?.length).to.equal(1);
    expect(updateToken?.credentials?.deviceTokens).to.deep.equal(['token_555']);
  });

  it('should update deviceTokens without duplication on channel creation (addChannelToSubscriber)', async function () {
    const subscriberId = SubscriberRepository.createObjectId();
    const test = await subscriberRepository.create({
      lastName: faker.name.lastName(),
      firstName: faker.name.firstName(),
      email: faker.internet.email(),
      phone: faker.phone.phoneNumber(),
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      subscriberId: subscriberId,
    });

    await updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        organizationId: session.organization._id,
        subscriberId: subscriberId,
        environmentId: session.environment._id,
        providerId: PushProviderIdEnum.FCM,
        credentials: { deviceTokens: ['token_1', 'token_1', 'token_1'] },
        oauthHandler: OAuthHandlerEnum.NOVU,
        isIdempotentOperation: true,
      })
    );

    let updatedSubscriber = await subscriberRepository.findBySubscriberId(session.environment._id, subscriberId);

    const addedFcmToken = updatedSubscriber?.channels?.find((channel) => channel.providerId === PushProviderIdEnum.FCM);

    expect(addedFcmToken?.credentials?.deviceTokens?.length).to.equal(1);
    expect(addedFcmToken?.credentials?.deviceTokens).to.deep.equal(['token_1']);
  });
});
