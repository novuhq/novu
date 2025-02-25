import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { SubscriberRepository } from '@novu/dal';

import { CreateOrUpdateSubscriberCommand } from './create-or-update-subscriber.command';

import { CacheInMemoryProviderService, CacheService, InvalidateCacheService } from '../../services';
import { UpdateSubscriber } from '../update-subscriber';
import { CreateOrUpdateSubscriberUseCase } from './create-or-update-subscriber.usecase';

const cacheInMemoryProviderService = {
  provide: CacheInMemoryProviderService,
  useFactory: async (): Promise<CacheInMemoryProviderService> => {
    return new CacheInMemoryProviderService();
  },
};

const cacheService = {
  provide: CacheService,
  useFactory: async () => {
    const factoryCacheInMemoryProviderService = await cacheInMemoryProviderService.useFactory();

    const service = new CacheService(factoryCacheInMemoryProviderService);
    await service.initialize();

    return service;
  },
};

describe('Create Subscriber', function () {
  let useCase: CreateOrUpdateSubscriberUseCase;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SubscriberRepository, InvalidateCacheService],
      providers: [UpdateSubscriber, cacheInMemoryProviderService, cacheService],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<CreateOrUpdateSubscriberUseCase>(CreateOrUpdateSubscriberUseCase);
  });

  it('should create a subscriber', async function () {
    const locale = 'en';
    const result = await useCase.execute(
      CreateOrUpdateSubscriberCommand.create({
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
      CreateOrUpdateSubscriberCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        subscriberId,
        email,
        firstName: 'First Name',
        locale: 'en',
      })
    );

    const result = await useCase.execute(
      CreateOrUpdateSubscriberCommand.create({
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
