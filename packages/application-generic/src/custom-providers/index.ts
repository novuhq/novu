import {
  StandardQueueServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
} from '../health';
import {
  AnalyticsService,
  BullMqService,
  CacheService,
  DistributedLockService,
  FeatureFlagsService,
  InMemoryProviderEnum,
  InMemoryProviderService,
  ReadinessService,
  OldInstanceBullMqService,
  StandardQueueService,
  WebSocketsQueueService,
  WorkflowQueueService,
} from '../services';
import {
  GetIsMultiProviderConfigurationEnabled,
  GetIsTopicNotificationEnabled,
} from '../usecases';

export const featureFlagsService = {
  provide: FeatureFlagsService,
  useFactory: async (): Promise<FeatureFlagsService> => {
    const instance = new FeatureFlagsService();
    await instance.initialize();

    return instance;
  },
};

export const getIsMultiProviderConfigurationEnabled = {
  provide: GetIsMultiProviderConfigurationEnabled,
  useFactory: async (
    featureFlagServiceItem: FeatureFlagsService
  ): Promise<GetIsMultiProviderConfigurationEnabled> => {
    const useCase = new GetIsMultiProviderConfigurationEnabled(
      featureFlagServiceItem
    );

    return useCase;
  },
  inject: [FeatureFlagsService],
};

export const getIsTopicNotificationEnabled = {
  provide: GetIsTopicNotificationEnabled,
  useFactory: async (
    featureFlagsServiceItem: FeatureFlagsService
  ): Promise<GetIsTopicNotificationEnabled> => {
    const useCase = new GetIsTopicNotificationEnabled(featureFlagsServiceItem);

    return useCase;
  },
  inject: [FeatureFlagsService],
};

export const inMemoryProviderService = {
  provide: InMemoryProviderService,
  useFactory: (
    provider: InMemoryProviderEnum,
    enableAutoPipelining?: boolean
  ): InMemoryProviderService => {
    return new InMemoryProviderService(provider, enableAutoPipelining);
  },
};

export const bullMqService = {
  provide: BullMqService,
  useFactory: async (): Promise<BullMqService> => {
    const service = new BullMqService();

    await service.initialize();

    return service;
  },
};

export const oldInstanceBullMqService = {
  provide: OldInstanceBullMqService,
  useFactory: async (): Promise<OldInstanceBullMqService> => {
    const service = new OldInstanceBullMqService();

    await service.initialize();

    return service;
  },
};

export const cacheService = {
  provide: CacheService,
  useFactory: async (): Promise<CacheService> => {
    const enableAutoPipelining =
      process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'false';
    const factoryInMemoryProviderService = inMemoryProviderService.useFactory(
      InMemoryProviderEnum.ELASTICACHE,
      enableAutoPipelining
    );

    const service = new CacheService(factoryInMemoryProviderService);

    await service.initialize();

    return service;
  },
};

export const analyticsService = {
  provide: AnalyticsService,
  useFactory: async () => {
    const service = new AnalyticsService(process.env.SEGMENT_TOKEN);
    await service.initialize();

    return service;
  },
};

export const distributedLockService = {
  provide: DistributedLockService,
  useFactory: async (): Promise<DistributedLockService> => {
    const factoryInMemoryProviderService = inMemoryProviderService.useFactory(
      InMemoryProviderEnum.ELASTICACHE
    );

    const service = new DistributedLockService(factoryInMemoryProviderService);

    await service.initialize();

    return service;
  },
};

export const bullMqTokenList = {
  provide: 'BULLMQ_LIST',
  useFactory: (
    standardQueueService: StandardQueueService,
    webSocketsQueueService: WebSocketsQueueService,
    workflowQueueService: WorkflowQueueService
  ) => {
    return [standardQueueService, webSocketsQueueService, workflowQueueService];
  },
  inject: [StandardQueueService, WebSocketsQueueService, WorkflowQueueService],
};
