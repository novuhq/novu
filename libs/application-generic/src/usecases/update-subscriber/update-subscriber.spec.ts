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
import { UpdateSubscriberCommand } from './update-subscriber.command';
import { UpdateSubscriber } from './update-subscriber.usecase';

describe('Update Subscriber', () => {
  const dalService = new DalService();
  const cacheInMemoryProviderService = new CacheInMemoryProviderService();
  const subscriberRepository = new SubscriberRepository();
  let updateUsecase: UpdateSubscriber;

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

    updateUsecase = moduleRef.get<UpdateSubscriber>(UpdateSubscriber);
  });

  it('should update subscribers name', async () => {
    const subscriber = await subscriberRepository.create({
      _organizationId: SubscriberRepository.createObjectId(),
      _environmentId: SubscriberRepository.createObjectId(),
      subscriberId: SubscriberRepository.createObjectId(),
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    });

    await updateUsecase.execute(
      UpdateSubscriberCommand.create({
        organizationId: subscriber._organizationId,
        environmentId: subscriber._environmentId,
        subscriberId: subscriber.subscriberId,
        lastName: 'Test Last Name',
        locale: 'sv',
      })
    );

    const updatedSubscriber = await subscriberRepository.findOne({
      _id: subscriber._id,
      _environmentId: subscriber._environmentId,
    });
    expect(updatedSubscriber?.lastName).toEqual('Test Last Name');
    expect(updatedSubscriber?.firstName).toEqual(subscriber.firstName);
    expect(updatedSubscriber?.email).toEqual(subscriber.email);
    expect(updatedSubscriber?.locale).toEqual('sv');
  });
});
