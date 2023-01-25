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
    const locale = 'en';
    const result = await useCase.execute(
      CreateSubscriberCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        subscriberId: '1234',
        email: 'dima@asdasdas.com',
        firstName: 'ASDAS',
        locale,
      })
    );

    expect(result.locale).to.equal(locale);
  });

  it('should update the subscriber when same id provided', async function () {
    const subscriberId = '1234';
    const email = 'dima@asdasdas.com';
    const noLocale = 'no';

    await useCase.execute(
      CreateSubscriberCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        subscriberId,
        email,
        firstName: 'First Name',
        locale: 'en',
      })
    );

    const result = await useCase.execute(
      CreateSubscriberCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        subscriberId,
        email,
        firstName: 'Second Name',
        locale: noLocale,
      })
    );

    expect(result.firstName).to.equal('Second Name');
    expect(result.locale).to.equal(noLocale);
  });
});
