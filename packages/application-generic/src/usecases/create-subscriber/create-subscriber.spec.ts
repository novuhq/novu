import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { SubscriberRepository } from '@novu/dal';

import { CreateSubscriber } from './create-subscriber.usecase';
import { CreateSubscriberCommand } from './create-subscriber.command';

import {
  CacheService,
  InMemoryProviderEnum,
  InMemoryProviderService,
  InvalidateCacheService,
} from '../../services';
import { UpdateSubscriber } from '../update-subscriber';

const inMemoryProviderService = {
  provide: InMemoryProviderService,
  useFactory: async (): Promise<InMemoryProviderService> => {
    const inMemoryProvider = new InMemoryProviderService(
      InMemoryProviderEnum.REDIS
    );

    return inMemoryProvider;
  },
};

const cacheService = {
  provide: CacheService,
  useFactory: async () => {
    const factoryInMemoryProviderService =
      await inMemoryProviderService.useFactory();

    const service = new CacheService(factoryInMemoryProviderService);
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
      providers: [UpdateSubscriber, inMemoryProviderService, cacheService],
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
