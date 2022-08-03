import { Test } from '@nestjs/testing';
import { SubscribersService, UserSession } from '@novu/testing';
import { GetSubscriber } from './get-subscriber.usecase';
import { SharedModule } from '../../../shared/shared.module';
import { GetSubscriberCommand } from './get-subscriber.command';
import { SubscribersModule } from '../../subscribers.module';
import { expect } from 'chai';

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
});
