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
  GetIsInMemoryClusterModeEnabled,
  GetIsMultiProviderConfigurationEnabled,
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
  InMemoryProviderEnum,
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

const inMemoryProviderService = {
  provide: InMemoryProviderService,
  useFactory: (
    getIsInMemoryClusterModeEnabledUseCase: GetIsInMemoryClusterModeEnabled,
    provider: InMemoryProviderEnum,
    enableAutoPipelining?: boolean
  ): InMemoryProviderService => {
    return new InMemoryProviderService(getIsInMemoryClusterModeEnabledUseCase, provider, enableAutoPipelining);
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
      InMemoryProviderEnum.ELASTICACHE,
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
  useFactory: async (
    getIsInMemoryClusterModeEnabledUseCase: GetIsInMemoryClusterModeEnabled
  ): Promise<DistributedLockService> => {
    const factoryInMemoryProviderService = await inMemoryProviderService.useFactory(
      getIsInMemoryClusterModeEnabledUseCase,
      InMemoryProviderEnum.ELASTICACHE
    );

    const service = new DistributedLockService(factoryInMemoryProviderService);

    await service.initialize();

    return service;
  },
  inject: [GetIsInMemoryClusterModeEnabled],
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
  getIsInMemoryClusterModeEnabled,
  getIsMultiProviderConfigurationEnabled,
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
