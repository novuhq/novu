import { SubscriberRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';

import { removeDuplicatedSubscribers } from './remove-duplicated-subscribers.migration';
import { expect } from 'chai';

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
