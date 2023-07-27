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
  PerformanceService,
  TriggerQueueService,
  GetIsInMemoryClusterModeEnabled,
  GetIsMultiProviderConfigurationEnabled,
  GetIsTopicNotificationEnabled,
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

const getIsInMemoryClusterModeEnabled = {
  provide: GetIsInMemoryClusterModeEnabled,
  useFactory: (): GetIsInMemoryClusterModeEnabled => {
    return new GetIsInMemoryClusterModeEnabled();
  },
};

const getIsMultiProviderConfigurationEnabled = {
  provide: GetIsMultiProviderConfigurationEnabled,
  useFactory: async (): Promise<GetIsMultiProviderConfigurationEnabled> => {
    const featureFlagsServiceFactory = await featureFlagsService.useFactory();
    const useCase = new GetIsMultiProviderConfigurationEnabled(featureFlagsServiceFactory);

    return useCase;
  },
};

const getIsTopicNotificationEnabled = {
  provide: GetIsTopicNotificationEnabled,
  useFactory: async (): Promise<GetIsTopicNotificationEnabled> => {
    const featureFlagsServiceFactory = await featureFlagsService.useFactory();
    const useCase = new GetIsTopicNotificationEnabled(featureFlagsServiceFactory);

    return useCase;
  },
};

const inMemoryProviderService = {
  provide: InMemoryProviderService,
  useFactory: (
    getIsInMemoryClusterModeEnabledUseCase: GetIsInMemoryClusterModeEnabled,
    enableAutoPipelining?: boolean
  ): InMemoryProviderService => {
    return new InMemoryProviderService(getIsInMemoryClusterModeEnabledUseCase, enableAutoPipelining);
  },
  inject: [GetIsInMemoryClusterModeEnabled],
};

const cacheService = {
  provide: CacheService,
  useFactory: async (
    getIsInMemoryClusterModeEnabledUseCase: GetIsInMemoryClusterModeEnabled
  ): Promise<CacheService> => {
    // TODO: Temporary to test in Dev. Should be removed.
    const enableAutoPipelining = process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';
    const factoryInMemoryProviderService = inMemoryProviderService.useFactory(
      getIsInMemoryClusterModeEnabledUseCase,
      enableAutoPipelining
    );

    const service = new CacheService(factoryInMemoryProviderService);

    await service.initialize();

    return service;
  },
  inject: [GetIsInMemoryClusterModeEnabled],
};

const distributedLockService = {
  provide: DistributedLockService,
  useFactory: (getIsInMemoryClusterModeEnabledUseCase: GetIsInMemoryClusterModeEnabled): DistributedLockService => {
    const factoryInMemoryProviderService = inMemoryProviderService.useFactory(getIsInMemoryClusterModeEnabledUseCase);

    return new DistributedLockService(factoryInMemoryProviderService);
  },
  inject: [GetIsInMemoryClusterModeEnabled],
};

const PROVIDERS = [
  launchDarklyService,
  featureFlagsService,
  getIsInMemoryClusterModeEnabled,
  getIsMultiProviderConfigurationEnabled,
  getIsTopicNotificationEnabled,
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
  {
    provide: PerformanceService,
    useFactory: () => {
      return new PerformanceService();
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
