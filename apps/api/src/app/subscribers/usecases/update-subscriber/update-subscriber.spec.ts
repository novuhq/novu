import { SubscriberRepository } from '@notifire/dal';
import { UserSession, SubscribersService } from '@notifire/testing';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { SharedModule } from '../../../shared/shared.module';
import { UpdateSubscriber } from './update-subscriber.usecase';
import { UpdateSubscriberCommand } from './update-subscriber.command';

describe('Update Subscriber', function () {
  let useCase: UpdateSubscriber;
  let session: UserSession;
  const subscriberRepository = new SubscriberRepository();
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [UpdateSubscriber],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<UpdateSubscriber>(UpdateSubscriber);
  });

  it('should update subscribers name', async function () {
    const subscriberService = new SubscribersService(session.organization._id, session.application._id);
    const subscriber = await subscriberService.createSubscriber();
    await useCase.execute(
      UpdateSubscriberCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        lastName: 'Test Last Name',
        applicationId: session.application._id,
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(subscriber._id);
    expect(updatedSubscriber.lastName).to.equal('Test Last Name');
    expect(updatedSubscriber.firstName).to.equal(subscriber.firstName);
    expect(updatedSubscriber.email).to.equal(subscriber.email);
  });
});
