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
} from '@novu/dal';
import {
  AnalyticsService,
  WsQueueService,
  createNestLoggingModuleOptions,
  LoggerModule,
  InvalidateCacheService,
  CacheService,
  DistributedLockService,
  GetFeatureFlag,
  InMemoryProviderService,
  StorageHelperService,
  StorageService,
  GCSStorageService,
  AzureBlobStorageService,
  S3StorageService,
  ReadinessService,
  QueueServiceHealthIndicator,
  TriggerQueueServiceHealthIndicator,
  WsQueueServiceHealthIndicator,
  QueueService,
  TriggerQueueService,
  LaunchDarklyService,
  FeatureFlagsService,
} from '@novu/application-generic';

import * as packageJson from '../../../package.json';
import { CreateLog } from './logs';

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
];

const dalService = new DalService();

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

const launchDarklyService = {
  provide: LaunchDarklyService,
  useFactory: async (): Promise<LaunchDarklyService> => {
    const service = new LaunchDarklyService();
    await service.initialize();

    return service;
  },
};

const featureFlagsService = {
  provide: FeatureFlagsService,
  useFactory: async (): Promise<FeatureFlagsService> => {
    const instance = new FeatureFlagsService();
    await instance.initialize();

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
  useFactory: async (enableAutoPipelining?: boolean): Promise<InMemoryProviderService> => {
    const getFeatureFlag = await getFeatureFlagUseCase.useFactory();
    const inMemoryProvider = new InMemoryProviderService(getFeatureFlag, enableAutoPipelining);
    await inMemoryProvider.initialize();

    return inMemoryProvider;
  },
};

const cacheService = {
  provide: CacheService,
  useFactory: async () => {
    // TODO: Temporary to test in Dev. Should be removed.
    const enableAutoPipelining = process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';
    const factoryInMemoryProviderService = await inMemoryProviderService.useFactory(enableAutoPipelining);

    const service = new CacheService(factoryInMemoryProviderService);

    await service.initialize();

    return service;
  },
};

const distributedLockService = {
  provide: DistributedLockService,
  useFactory: async () => {
    const factoryInMemoryProviderService = await inMemoryProviderService.useFactory();

    return new DistributedLockService(factoryInMemoryProviderService);
  },
};

const readinessService = {
  provide: ReadinessService,
  useFactory: (
    queueServiceHealthIndicator: QueueServiceHealthIndicator,
    triggerQueueServiceHealthIndicator: TriggerQueueServiceHealthIndicator,
    wsQueueServiceHealthIndicator: WsQueueServiceHealthIndicator
  ) => {
    return new ReadinessService(
      queueServiceHealthIndicator,
      triggerQueueServiceHealthIndicator,
      wsQueueServiceHealthIndicator
    );
  },
  inject: [QueueServiceHealthIndicator, TriggerQueueServiceHealthIndicator, WsQueueServiceHealthIndicator],
};

const PROVIDERS = [
  launchDarklyService,
  featureFlagsService,
  getFeatureFlagUseCase,
  inMemoryProviderService,
  cacheService,
  distributedLockService,
  {
    provide: AnalyticsService,
    useFactory: async () => {
      const analyticsService = new AnalyticsService(process.env.SEGMENT_TOKEN);

      await analyticsService.initialize();

      return analyticsService;
    },
  },
  {
    provide: DalService,
    useFactory: async () => {
      await dalService.connect(process.env.MONGO_URL);

      return dalService;
    },
  },
  InvalidateCacheService,
  CreateLog,
  {
    provide: StorageService,
    useClass: getStorageServiceClass(),
  },
  QueueServiceHealthIndicator,
  TriggerQueueServiceHealthIndicator,
  WsQueueServiceHealthIndicator,
  QueueService,
  TriggerQueueService,
  WsQueueService,
  StorageHelperService,
  readinessService,
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
