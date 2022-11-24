import { Test } from '@nestjs/testing';
import { SubscribersService, UserSession } from '@novu/testing';
import { NotFoundException } from '@nestjs/common';
import { expect } from 'chai';

import { RemoveSubscriber } from './remove-subscriber.usecase';
import { RemoveSubscriberCommand } from './remove-subscriber.command';

import { SharedModule } from '../../../shared/shared.module';
import { SubscribersModule } from '../../subscribers.module';

describe('Remove Subscriber', function () {
  let useCase: RemoveSubscriber;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, SubscribersModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<RemoveSubscriber>(RemoveSubscriber);
  });

  it('should remove a subscriber', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    const subscriber = await subscriberService.createSubscriber();

    const res = await useCase.execute(
      RemoveSubscriberCommand.create({
        subscriberId: subscriber.subscriberId,
        environmentId: session.environment._id,
        organizationId: session.organization._id,
      })
    );

    expect(res).to.eql({ acknowledged: true, status: 'deleted' });
  });

  it('should throw a not found exception if subscriber to remove does not exist', async () => {
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);

    try {
      await useCase.execute(
        RemoveSubscriberCommand.create({
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
