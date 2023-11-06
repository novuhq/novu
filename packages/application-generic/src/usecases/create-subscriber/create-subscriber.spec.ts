import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { SubscriberRepository } from '@novu/dal';

import { CreateSubscriber } from './create-subscriber.usecase';
import { CreateSubscriberCommand } from './create-subscriber.command';

import {
  CacheService,
  CacheInMemoryProviderService,
  InMemoryProviderEnum,
  InMemoryProviderService,
  InvalidateCacheService,
} from '../../services';
import { UpdateSubscriber } from '../update-subscriber';

const cacheInMemoryProviderService = {
  provide: CacheInMemoryProviderService,
  useFactory: async (): Promise<CacheInMemoryProviderService> => {
    const cacheInMemoryProvider = new CacheInMemoryProviderService();

    return cacheInMemoryProvider;
  },
};

const cacheService = {
  provide: CacheService,
  useFactory: async () => {
    const factoryCacheInMemoryProviderService =
      await cacheInMemoryProviderService.useFactory();

    const service = new CacheService(factoryCacheInMemoryProviderService);
    await service.initialize();

    return service;
  },
};

describe('Create Subscriber', function () {
  let useCase: CreateSubscriber;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SubscriberRepository, InvalidateCacheService],
      providers: [UpdateSubscriber, cacheInMemoryProviderService, cacheService],
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

    expect(result.locale).toEqual(locale);
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

    expect(result.firstName).toEqual('Second Name');
    expect(result.locale).toEqual(noLocale);
  });
});
