import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { CreateSubscriber } from './create-subscriber.usecase';
import { SharedModule } from '../../../shared/shared.module';
import { CreateSubscriberCommand } from './create-subscriber.command';
import { SubscribersModule } from '../../subscribers.module';

describe('Create Subscriber', function () {
  let useCase: CreateSubscriber;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, SubscribersModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<CreateSubscriber>(CreateSubscriber);
  });

  it('should create a subscriber', async function () {
    const result = await useCase.execute(
      CreateSubscriberCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        subscriberId: '1234',
        email: 'dima@asdasdas.com',
        firstName: 'ASDAS',
      })
    );
  });

  it('should update the subscriber when same id provided', async function () {
    await useCase.execute(
      CreateSubscriberCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        subscriberId: '1234',
        email: 'dima@asdasdas.com',
        firstName: 'First Name',
      })
    );

    const result = await useCase.execute(
      CreateSubscriberCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        subscriberId: '1234',
        email: 'dima@asdasdas.com',
        firstName: 'Second Name',
      })
    );

    expect(result.firstName).to.equal('Second Name');
  });
});
