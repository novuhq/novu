import { SubscriberRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';

import { removeDuplicatedSubscribers } from './remove-duplicated-subscribers.migration';
import { expect } from 'chai';
import { ChatProviderIdEnum, IChannelSettings, ISubscriber } from '@novu/shared';

describe('Migration: Remove Duplicated Subscribers', () => {
  let session: UserSession;
  let subscriberService: SubscribersService;
  const subscriberRepository = new SubscriberRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
  });

  it('should remove duplicated subscribers', async () => {
    const duplicatedSubscriberId = '123';

    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_subscriber',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'mid_subscriber',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'last_subscriber',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const duplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });

    expect(duplicates.length).to.equal(3);

    await removeDuplicatedSubscribers();

    const remainingDuplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });

    expect(remainingDuplicates.length).to.equal(1);
    expect(remainingDuplicates[0].firstName).to.equal('last_subscriber');
  });

  it('should always keep one subscriber per environment', async () => {
    const duplicatedSubscriberId = '123';
    const firstEnvironmentId = session.environment._id;

    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'env_1',
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
    });
    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'env_1',
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
    });

    const secondEnvironmentId = session.organization._id;

    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'env_2',
      _environmentId: secondEnvironmentId,
      _organizationId: session.organization._id,
    });
    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'env_2',
      _environmentId: secondEnvironmentId,
      _organizationId: session.organization._id,
    });

    const duplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });
    expect(duplicates.length).to.equal(2);

    const duplicates2 = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });
    expect(duplicates2.length).to.equal(2);

    await removeDuplicatedSubscribers();

    const remainingDuplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });
    expect(remainingDuplicates.length).to.equal(1);
    expect(remainingDuplicates[0].firstName).to.equal('env_1');

    const remainingDuplicates2 = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: secondEnvironmentId,
    });
    expect(remainingDuplicates2.length).to.equal(1);
    expect(remainingDuplicates2[0].firstName).to.equal('env_2');
  });

  it('should merge the metadata across duplicated subscribers', async () => {
    const duplicatedSubscriberId = '123';
    const firstEnvironmentId = session.environment._id;

    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_name',
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
    });
    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      lastName: 'last_name',
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
    });

    const duplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });
    expect(duplicates.length).to.equal(2);

    await removeDuplicatedSubscribers();

    const remainingDuplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });
    expect(remainingDuplicates.length).to.equal(1);
    expect(remainingDuplicates[0].firstName).to.equal('first_name');
    expect(remainingDuplicates[0].lastName).to.equal('last_name');
  });

  it('should merge the metadata across duplicated subscribers by latest created subscriber', async () => {
    const duplicatedSubscriberId = '123';
    const firstEnvironmentId = session.environment._id;

    const firstCreatedSubscriber = await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_name_1',
      lastName: 'last_name_1',
      email: 'email_1',
      phone: 'phone_1',
      avatar: 'avatar_1',
      locale: 'locale_1',
      data: { key: 'value_1' },
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
    });

    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_name_2',
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
    });

    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      email: 'email_3',
      phone: 'phone_3',
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
    });

    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      avatar: 'avatar_4',
      data: { newStuff: 'value_4' },
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
    });

    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_name_5',
      locale: 'locale_5',
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
    });

    const duplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });
    expect(duplicates.length).to.equal(5);

    await removeDuplicatedSubscribers();

    const remainingDuplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });
    expect(remainingDuplicates.length).to.equal(1);
    expect(remainingDuplicates[0]._id).to.equal(firstCreatedSubscriber._id);
    expect(remainingDuplicates[0]._organizationId).to.equal(firstCreatedSubscriber._organizationId);
    expect(remainingDuplicates[0]._environmentId).to.equal(firstCreatedSubscriber._environmentId);
    expect(remainingDuplicates[0].__v).to.equal(firstCreatedSubscriber.__v);

    expect(remainingDuplicates[0].firstName).to.equal('first_name_5');
    expect(remainingDuplicates[0].lastName).to.equal('last_name_1');
    expect(remainingDuplicates[0].email).to.equal('email_3');
    expect(remainingDuplicates[0].phone).to.equal('phone_3');
    expect(remainingDuplicates[0].avatar).to.equal('avatar_4');
    expect(remainingDuplicates[0].locale).to.equal('locale_5');
    expect(remainingDuplicates[0].data?.key).to.be.undefined;
    expect(remainingDuplicates[0].data?.newStuff).to.equal('value_4');
  });

  it('should merge 2 channel integration', async () => {
    const duplicatedSubscriberId = '123';
    const firstEnvironmentId = session.environment._id;

    const subscriber1: ISubscriber = {
      email: 'email_1',
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_name_1',
      lastName: 'last_name_1',
      channels: [{ _integrationId: '1', providerId: ChatProviderIdEnum.Slack, credentials: { webhookUrl: 'url_1' } }],
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
      deleted: false,
      createdAt: '2021-01-01T00:00:00.000Z',
      updatedAt: '2021-01-01T00:00:00.000Z',
    };
    const firstCreatedSubscriber = await subscriberRepository.create(subscriber1);

    const subscriber2: ISubscriber = {
      email: 'email_1',
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_name_1',
      lastName: 'last_name_1',
      channels: [
        {
          _integrationId: '2',
          providerId: ChatProviderIdEnum.Discord,
          credentials: { deviceTokens: ['token_123', 'token_123'] },
        },
      ],
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
      deleted: false,
      createdAt: '2021-01-01T00:00:00.000Z',
      updatedAt: '2021-01-01T00:00:00.000Z',
    };
    await subscriberRepository.create(subscriber2);

    await removeDuplicatedSubscribers();

    const remainingDuplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });
    expect(remainingDuplicates.length).to.equal(1);
    expect(remainingDuplicates[0]._id).to.equal(firstCreatedSubscriber._id);
    expect(remainingDuplicates[0]._organizationId).to.equal(firstCreatedSubscriber._organizationId);
    expect(remainingDuplicates[0]._environmentId).to.equal(firstCreatedSubscriber._environmentId);
    expect(remainingDuplicates[0].email).to.equal('email_1');
    expect(remainingDuplicates[0].firstName).to.equal('first_name_1');
    expect(remainingDuplicates[0].lastName).to.equal('last_name_1');
    expect(remainingDuplicates[0].createdAt).to.equal('2021-01-01T00:00:00.000Z');

    const firstChannel: IChannelSettings | undefined = remainingDuplicates[0].channels?.find(
      (channel) => channel._integrationId === '1'
    );
    expect(firstChannel?._integrationId).to.equal('1');
    expect(firstChannel?.providerId).to.equal(ChatProviderIdEnum.Slack);
    expect(firstChannel?.credentials.webhookUrl).to.equal('url_1');

    const secondChannel: IChannelSettings | undefined = remainingDuplicates[0].channels?.find(
      (channel) => channel._integrationId === '2'
    );
    expect(secondChannel?._integrationId).to.equal('2');
    expect(secondChannel?.providerId).to.equal(ChatProviderIdEnum.Discord);
    expect(secondChannel?.credentials.deviceTokens).to.deep.equal(['token_123']);
  });

  it('should merge 2 channel same integration', async () => {
    const duplicatedSubscriberId = '123';
    const firstEnvironmentId = session.environment._id;

    const subscriber1: ISubscriber = {
      email: 'email_1',
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_name_1',
      lastName: 'last_name_1',
      channels: [
        {
          _integrationId: '1',
          providerId: ChatProviderIdEnum.Discord,
          credentials: { deviceTokens: ['token_1', 'token_2'] },
        },
      ],
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
      deleted: false,
      createdAt: '2021-01-01T00:00:00.000Z',
      updatedAt: '2021-01-01T00:00:00.000Z',
    };
    const firstCreatedSubscriber = await subscriberRepository.create(subscriber1);

    const subscriber2: ISubscriber = {
      email: 'email_1',
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_name_1',
      lastName: 'last_name_1',
      channels: [
        {
          _integrationId: '1',
          providerId: ChatProviderIdEnum.Discord,
          credentials: { deviceTokens: ['token_2', 'token_3', 'token_3'] },
        },
      ],
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
      deleted: false,
      createdAt: '2021-01-01T00:00:00.000Z',
      updatedAt: '2021-01-01T00:00:00.000Z',
    };
    await subscriberRepository.create(subscriber2);

    await removeDuplicatedSubscribers();

    const remainingDuplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });
    expect(remainingDuplicates.length).to.equal(1);
    expect(remainingDuplicates[0]._id).to.equal(firstCreatedSubscriber._id);
    expect(remainingDuplicates[0]._organizationId).to.equal(firstCreatedSubscriber._organizationId);
    expect(remainingDuplicates[0]._environmentId).to.equal(firstCreatedSubscriber._environmentId);
    expect(remainingDuplicates[0].email).to.equal('email_1');
    expect(remainingDuplicates[0].firstName).to.equal('first_name_1');
    expect(remainingDuplicates[0].lastName).to.equal('last_name_1');
    expect(remainingDuplicates[0].createdAt).to.equal('2021-01-01T00:00:00.000Z');

    const firstChannel: IChannelSettings | undefined = remainingDuplicates[0].channels?.find(
      (channel) => channel._integrationId === '1'
    );
    expect(firstChannel?._integrationId).to.equal('1');
    expect(firstChannel?.providerId).to.equal(ChatProviderIdEnum.Discord);
    expect(firstChannel?.credentials.deviceTokens).to.deep.equal(['token_1', 'token_2', 'token_3']);
  });

  it('should merge 2 channel same integration', async () => {
    const duplicatedSubscriberId = '123';
    const firstEnvironmentId = session.environment._id;

    const subscriber1: ISubscriber = {
      email: 'email_1',
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_name_1',
      lastName: 'last_name_1',
      channels: [
        {
          _integrationId: '1',
          providerId: ChatProviderIdEnum.Slack,
          credentials: { webhookUrl: 'old_url_1' },
        },
      ],
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
      deleted: false,
      createdAt: '2021-01-01T00:00:00.000Z',
      updatedAt: '2021-01-01T00:00:00.000Z',
    };
    const firstCreatedSubscriber = await subscriberRepository.create(subscriber1);

    const subscriber2: ISubscriber = {
      email: 'email_1',
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_name_1',
      lastName: 'last_name_1',
      channels: [
        {
          _integrationId: '1',
          providerId: ChatProviderIdEnum.Slack,
          credentials: { webhookUrl: 'new_url_1' },
        },
      ],
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
      deleted: false,
      createdAt: '2021-01-01T00:00:00.000Z',
      updatedAt: '2021-01-01T00:00:00.000Z',
    };
    await subscriberRepository.create(subscriber2);

    await removeDuplicatedSubscribers();

    const remainingDuplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });
    expect(remainingDuplicates.length).to.equal(1);
    expect(remainingDuplicates[0]._id).to.equal(firstCreatedSubscriber._id);
    expect(remainingDuplicates[0]._organizationId).to.equal(firstCreatedSubscriber._organizationId);
    expect(remainingDuplicates[0]._environmentId).to.equal(firstCreatedSubscriber._environmentId);
    expect(remainingDuplicates[0].email).to.equal('email_1');
    expect(remainingDuplicates[0].firstName).to.equal('first_name_1');
    expect(remainingDuplicates[0].lastName).to.equal('last_name_1');
    expect(remainingDuplicates[0].createdAt).to.equal('2021-01-01T00:00:00.000Z');

    const firstChannel: IChannelSettings | undefined = remainingDuplicates[0].channels?.find(
      (channel) => channel._integrationId === '1'
    );
    expect(firstChannel?._integrationId).to.equal('1');
    expect(firstChannel?.providerId).to.equal(ChatProviderIdEnum.Slack);
    expect(firstChannel?.credentials.webhookUrl).to.be.equal('new_url_1');
  });

  it('should keep the first created subscriber after merge', async () => {
    const duplicatedSubscriberId = '123';
    const firstEnvironmentId = session.environment._id;

    const firstCreatedSubscriber = await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_name',
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
    });
    await subscriberRepository.create({
      subscriberId: duplicatedSubscriberId,
      firstName: 'first_name_2',
      _environmentId: firstEnvironmentId,
      _organizationId: session.organization._id,
    });

    const duplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });
    expect(duplicates.length).to.equal(2);

    await removeDuplicatedSubscribers();

    const remainingDuplicates = await subscriberRepository.find({
      subscriberId: duplicatedSubscriberId,
      _environmentId: session.environment._id,
    });

    expect(remainingDuplicates.length).to.equal(1);
    expect(remainingDuplicates[0]._id).to.equal(firstCreatedSubscriber._id);
  });
});
