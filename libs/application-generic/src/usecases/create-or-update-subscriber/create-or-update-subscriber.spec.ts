import { Test } from '@nestjs/testing';
import { DalService, IntegrationRepository, SubscriberRepository } from '@novu/dal';
import {
  AnalyticsService,
  CacheInMemoryProviderService,
  CacheService,
  FeatureFlagsService,
  InvalidateCacheService,
} from '../../services';
import { UpdateSubscriberChannel } from '../subscribers/update-subscriber-channel';
import { UpdateSubscriber } from '../update-subscriber';
import { CreateOrUpdateSubscriberCommand } from './create-or-update-subscriber.command';
import { CreateOrUpdateSubscriberUseCase } from './create-or-update-subscriber.usecase';

describe('Create Subscriber', () => {
  const dalService = new DalService();
  const cacheInMemoryProviderService = new CacheInMemoryProviderService();
  let useCase: CreateOrUpdateSubscriberUseCase;
  let organizationId: string;
  let environmentId: string;
  let subscriberRepository: SubscriberRepository;
  let invalidateCacheService: InvalidateCacheService;

  beforeAll(async () => {
    await dalService.connect(process.env.MONGO_URL as string);
  });

  afterAll(async () => {
    await cacheInMemoryProviderService.shutdown();
    await dalService.disconnect();
  });

  beforeEach(async () => {
    const cacheService = new CacheService(cacheInMemoryProviderService);
    await cacheService.initialize();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateOrUpdateSubscriberUseCase,
        UpdateSubscriber,
        UpdateSubscriberChannel,
        SubscriberRepository,
        IntegrationRepository,
        InvalidateCacheService,
        { provide: CacheService, useValue: cacheService },
        { provide: AnalyticsService, useValue: new AnalyticsService() },
        {
          provide: FeatureFlagsService,
          useValue: { getFlag: vi.fn(async ({ defaultValue }) => defaultValue) },
        },
      ],
    }).compile();

    useCase = moduleRef.get<CreateOrUpdateSubscriberUseCase>(CreateOrUpdateSubscriberUseCase);
    subscriberRepository = moduleRef.get<SubscriberRepository>(SubscriberRepository);
    invalidateCacheService = moduleRef.get<InvalidateCacheService>(InvalidateCacheService);
    organizationId = SubscriberRepository.createObjectId();
    environmentId = SubscriberRepository.createObjectId();
  });

  it('should create a subscriber', async () => {
    const locale = 'en';
    const result = await useCase.execute(
      CreateOrUpdateSubscriberCommand.create({
        organizationId,
        environmentId,
        subscriberId: '1234',
        email: 'dima@asdasdas.com',
        firstName: 'ASDAS',
        locale,
      })
    );

    expect(result.locale).toEqual(locale);
  });

  it('should update the subscriber when same id provided', async () => {
    const subscriberId = '1234';
    const email = 'dima@asdasdas.com';
    const noLocale = 'no';

    await useCase.execute(
      CreateOrUpdateSubscriberCommand.create({
        organizationId,
        environmentId,
        subscriberId,
        email,
        firstName: 'First Name',
        locale: 'en',
      })
    );

    const result = await useCase.execute(
      CreateOrUpdateSubscriberCommand.create({
        organizationId,
        environmentId,
        subscriberId,
        email,
        firstName: 'Second Name',
        locale: noLocale,
      })
    );

    expect(result.firstName).toEqual('Second Name');
    expect(result.locale).toEqual(noLocale);
  });

  it('should not invalidate the subscriber cache when an upsert changes nothing', async () => {
    const command = CreateOrUpdateSubscriberCommand.create({
      organizationId,
      environmentId,
      subscriberId: 'no-op-subscriber',
      email: 'no-op@example.com',
      firstName: 'Same',
    });

    await useCase.execute(command);

    const invalidateSpy = vi.spyOn(invalidateCacheService, 'invalidateByKey');
    const updateSpy = vi.spyOn(subscriberRepository, 'update');

    const result = await useCase.execute(command);

    expect(result.firstName).toEqual('Same');
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('should return the updated subscriber without re-reading it', async () => {
    const subscriberId = 'update-no-refetch';

    await useCase.execute(
      CreateOrUpdateSubscriberCommand.create({
        organizationId,
        environmentId,
        subscriberId,
        firstName: 'Before',
      })
    );

    const findSpy = vi.spyOn(subscriberRepository, 'findBySubscriberId');

    const result = await useCase.execute(
      CreateOrUpdateSubscriberCommand.create({
        organizationId,
        environmentId,
        subscriberId,
        firstName: 'After',
      })
    );

    expect(result.firstName).toEqual('After');
    expect(findSpy).toHaveBeenCalledTimes(1);

    const persisted = await subscriberRepository.findBySubscriberId(environmentId, subscriberId);
    expect(persisted?.firstName).toEqual('After');
    expect(new Date(result.updatedAt).getTime()).toEqual(new Date(persisted?.updatedAt as string).getTime());
  });
});
