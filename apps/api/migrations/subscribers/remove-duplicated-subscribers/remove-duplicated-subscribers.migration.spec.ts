import { TopicSubscribersRepository, SubscriberRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';

import { removeDuplicatedSubscribers } from './remove-duplicated-subscribers.migration';
import { expect } from 'chai';

describe('Migration: Remove Duplicated Subscribers', () => {
  let session: UserSession;
  let subscriberService: SubscribersService;
  const subscriberRepository = new SubscriberRepository();
  const topicSubscribersRepository = new TopicSubscribersRepository();

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
});
