import {
  StandardQueueServiceHealthIndicator,
  WebSocketsQueueServiceHealthIndicator,
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
  LaunchDarklyService,
  ReadinessService,
  OldInstanceBullMqService,
} from '../services';
import {
  GetIsInMemoryClusterModeEnabled,
  GetIsMultiProviderConfigurationEnabled,
  GetIsTopicNotificationEnabled,
} from '../usecases';

export const launchDarklyService = {
  provide: LaunchDarklyService,
  useFactory: async (): Promise<LaunchDarklyService> => {
    const service = new LaunchDarklyService();
    await service.initialize();

    return service;
  },
};

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
  useFactory: async (): Promise<GetIsMultiProviderConfigurationEnabled> => {
    const featureFlagsServiceFactory = await featureFlagsService.useFactory();
    const useCase = new GetIsMultiProviderConfigurationEnabled(
      featureFlagsServiceFactory
    );

    return useCase;
  },
};

export const getIsTopicNotificationEnabled = {
  provide: GetIsTopicNotificationEnabled,
  useFactory: async (): Promise<GetIsTopicNotificationEnabled> => {
    const featureFlagsServiceFactory = await featureFlagsService.useFactory();
    const useCase = new GetIsTopicNotificationEnabled(
      featureFlagsServiceFactory
    );

    return useCase;
  },
};

export const inMemoryProviderService = {
  useFactory: (
    getIsInMemoryClusterModeEnabledUseCase: GetIsInMemoryClusterModeEnabled,
    provider: InMemoryProviderEnum,
    enableAutoPipelining?: boolean
  ): InMemoryProviderService => {
    return new InMemoryProviderService(
      getIsInMemoryClusterModeEnabledUseCase,
      provider,
      enableAutoPipelining
    );
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
  useFactory: async (
    getIsInMemoryClusterModeEnabledUseCase: GetIsInMemoryClusterModeEnabled
  ): Promise<CacheService> => {
    // TODO: Temporary to test in Dev. Should be removed.
    const enableAutoPipelining =
      process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';
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
  useFactory: async (
    getIsInMemoryClusterModeEnabledUseCase: GetIsInMemoryClusterModeEnabled
  ): Promise<DistributedLockService> => {
    const factoryInMemoryProviderService = inMemoryProviderService.useFactory(
      getIsInMemoryClusterModeEnabledUseCase,
      InMemoryProviderEnum.ELASTICACHE
    );

    const service = new DistributedLockService(factoryInMemoryProviderService);

    await service.initialize();

    return service;
  },
  inject: [GetIsInMemoryClusterModeEnabled],
};

export const readinessService = {
  provide: ReadinessService,
  useFactory: (
    standardQueueServiceHealthIndicator: StandardQueueServiceHealthIndicator,
    webSocketsQueueServiceHealthIndicator: WebSocketsQueueServiceHealthIndicator,
    workflowQueueServiceHealthIndicator: WorkflowQueueServiceHealthIndicator
  ) => {
    return new ReadinessService(
      standardQueueServiceHealthIndicator,
      webSocketsQueueServiceHealthIndicator,
      workflowQueueServiceHealthIndicator
    );
  },
  inject: [
    StandardQueueServiceHealthIndicator,
    WebSocketsQueueServiceHealthIndicator,
    WorkflowQueueServiceHealthIndicator,
  ],
};
