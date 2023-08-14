import { Module } from '@nestjs/common';
import {
  DalService,
  UserRepository,
  OrganizationRepository,
  EnvironmentRepository,
  ExecutionDetailsRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
  NotificationRepository,
  MessageRepository,
  NotificationGroupRepository,
  MessageTemplateRepository,
  MemberRepository,
  LayoutRepository,
  LogRepository,
  IntegrationRepository,
  ChangeRepository,
  JobRepository,
  FeedRepository,
  SubscriberPreferenceRepository,
  TopicRepository,
  TopicSubscribersRepository,
  TenantRepository,
} from '@novu/dal';
import {
  InMemoryProviderService,
  AnalyticsService,
  createNestLoggingModuleOptions,
  LoggerModule,
  CacheService,
  InvalidateCacheService,
  AzureBlobStorageService,
  GCSStorageService,
  S3StorageService,
  StorageService,
  WsQueueService,
  DistributedLockService,
  TriggerQueueService,
  GetFeatureFlag,
  LaunchDarklyService,
  FeatureFlagsService,
} from '@novu/application-generic';

import * as packageJson from '../../../package.json';

const DAL_MODELS = [
  UserRepository,
  OrganizationRepository,
  EnvironmentRepository,
  ExecutionDetailsRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
  NotificationRepository,
  MessageRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  MemberRepository,
  LayoutRepository,
  LogRepository,
  IntegrationRepository,
  ChangeRepository,
  JobRepository,
  FeedRepository,
  SubscriberPreferenceRepository,
  TopicRepository,
  TopicSubscribersRepository,
  TenantRepository,
];

function getStorageServiceClass() {
  switch (process.env.STORAGE_SERVICE) {
    case 'GCS':
      return GCSStorageService;
    case 'AZURE':
      return AzureBlobStorageService;
    default:
      return S3StorageService;
  }
}

const dalService = new DalService();

const launchDarklyService = {
  provide: LaunchDarklyService,
  useFactory: (): LaunchDarklyService => {
    const service = new LaunchDarklyService();

    return service;
  },
};

const featureFlagsService = {
  provide: FeatureFlagsService,
  useFactory: async (): Promise<FeatureFlagsService> => {
    const instance = new FeatureFlagsService();

    await instance.service.initialize();

    return instance;
  },
};

const getFeatureFlagUseCase = {
  provide: GetFeatureFlag,
  useFactory: async (): Promise<GetFeatureFlag> => {
    const featureFlagsServiceFactory = await featureFlagsService.useFactory();
    const getFeatureFlag = new GetFeatureFlag(featureFlagsServiceFactory);

    return getFeatureFlag;
  },
};

const inMemoryProviderService = {
  provide: InMemoryProviderService,
  useFactory: (enableAutoPipelining?: boolean): InMemoryProviderService => {
    const inMemoryProvider = new InMemoryProviderService(enableAutoPipelining);
    inMemoryProvider.initialize();

    return inMemoryProvider;
  },
};

const cacheService = {
  provide: CacheService,
  useFactory: () => {
    // TODO: Temporary to test in Dev. Should be removed.
    const enableAutoPipelining = process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';
    const factoryInMemoryProviderService = inMemoryProviderService.useFactory(enableAutoPipelining);

    return new CacheService(factoryInMemoryProviderService);
  },
};

const distributedLockService = {
  provide: DistributedLockService,
  useFactory: () => {
    const factoryInMemoryProviderService = inMemoryProviderService.useFactory();

    return new DistributedLockService(factoryInMemoryProviderService);
  },
};

const PROVIDERS = [
  launchDarklyService,
  featureFlagsService,
  getFeatureFlagUseCase,
  inMemoryProviderService,
  cacheService,
  distributedLockService,
  {
    provide: WsQueueService,
    useClass: WsQueueService,
  },
  {
    provide: DalService,
    useFactory: async () => {
      await dalService.connect(process.env.MONGO_URL);

      return dalService;
    },
  },
  InvalidateCacheService,
  ...DAL_MODELS,
  {
    provide: StorageService,
    useClass: getStorageServiceClass(),
  },
  {
    provide: AnalyticsService,
    useFactory: async () => {
      const analyticsService = new AnalyticsService(process.env.SEGMENT_TOKEN);

      await analyticsService.initialize();

      return analyticsService;
    },
  },
  TriggerQueueService,
  ...DAL_MODELS,
];

@Module({
  imports: [
    LoggerModule.forRoot(
      createNestLoggingModuleOptions({
        serviceName: packageJson.name,
        version: packageJson.version,
      })
    ),
  ],
  providers: [...PROVIDERS],
  exports: [...PROVIDERS, LoggerModule],
})
export class SharedModule {}
