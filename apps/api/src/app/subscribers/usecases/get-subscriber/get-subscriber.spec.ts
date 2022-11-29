import { Test } from '@nestjs/testing';
import { SubscribersService, UserSession } from '@novu/testing';
import { NotFoundException } from '@nestjs/common';
import { expect } from 'chai';

import { GetSubscriber } from './get-subscriber.usecase';
import { GetSubscriberCommand } from './get-subscriber.command';

import { SubscribersModule } from '../../subscribers.module';
import { SharedModule } from '../../../shared/shared.module';

describe('Get Subscriber', function () {
  let useCase: GetSubscriber;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, SubscribersModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<GetSubscriber>(GetSubscriber);
  });

  it('should get a subscriber', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();
    const res = await useCase.execute(
      GetSubscriberCommand.create({
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        organizationId: session.organization._id,
      })
    );
    expect(res.subscriberId).to.equal(subscriber.subscriberId);
  });

  it('should get a not found exception if subscriber does not exist', async () => {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);

    try {
      await useCase.execute(
        GetSubscriberCommand.create({
          subscriberId: 'invalid-subscriber-id',
          environmentId: session.environment._id,
          organizationId: session.organization._id,
        })
      );
      throw new Error('Should not reach here');
    } catch (e) {
      expect(e).to.be.instanceOf(NotFoundException);
      expect(e.message).to.eql('Subscriber not found for id invalid-subscriber-id');
    }
  });
});
