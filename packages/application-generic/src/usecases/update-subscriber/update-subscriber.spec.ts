import { SubscriberRepository } from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';
import { Test } from '@nestjs/testing';

import { CacheService, InvalidateCacheService } from '../../services/cache';
import { UpdateSubscriber } from './update-subscriber.usecase';
import { UpdateSubscriberCommand } from './update-subscriber.command';
import { InMemoryProviderService } from '../../services';

const inMemoryProviderService = {
  provide: InMemoryProviderService,
  useFactory: () => {
    const service = new InMemoryProviderService();
    service.initialize();

    return service;
  },
};

const cacheService = {
  provide: CacheService,
  useFactory: () => {
    const factoryInMemoryProviderService = inMemoryProviderService.useFactory();

    return new CacheService(factoryInMemoryProviderService);
  },
};

describe('Update Subscriber', function () {
  let updateUsecase: UpdateSubscriber;
  let session: UserSession;
  const subscriberRepository = new SubscriberRepository();
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SubscriberRepository, InvalidateCacheService],
      providers: [UpdateSubscriber, inMemoryProviderService, cacheService],
    }).compile();

    session = new UserSession();
    await session.initialize();

    updateUsecase = moduleRef.get<UpdateSubscriber>(UpdateSubscriber);
  });

  it('should update subscribers name', async function () {
    const subscriberService = new SubscribersService(
      session.organization._id,
      session.environment._id
    );
    const subscriber = await subscriberService.createSubscriber();
    await updateUsecase.execute(
      UpdateSubscriberCommand.create({
        organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
        lastName: 'Test Last Name',
        locale: 'sv',
        environmentId: session.environment._id,
      })
    );

    const updatedSubscriber = await subscriberRepository.findById(
      subscriber._id
    );
    expect(updatedSubscriber.lastName).toEqual('Test Last Name');
    expect(updatedSubscriber.firstName).toEqual(subscriber.firstName);
    expect(updatedSubscriber.email).toEqual(subscriber.email);
    expect(updatedSubscriber.locale).toEqual('sv');
  });
});
