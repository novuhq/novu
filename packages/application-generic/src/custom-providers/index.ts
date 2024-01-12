import {
  AnalyticsService,
  CacheInMemoryProviderService,
  CacheService,
  DistributedLockService,
  FeatureFlagsService,
} from '../services';
import {
  GetIsApiIdempotencyEnabled,
  GetIsApiRateLimitingEnabled,
  GetIsTopicNotificationEnabled,
  GetUseMergedDigestId,
} from '../usecases';

export const featureFlagsService = {
  provide: FeatureFlagsService,
  useFactory: async (): Promise<FeatureFlagsService> => {
    const instance = new FeatureFlagsService();
    await instance.initialize();

    return instance;
  },
};

export const getUseMergedDigestId = {
  provide: GetUseMergedDigestId,
  useFactory: async (
    featureFlagServiceItem: FeatureFlagsService
  ): Promise<GetUseMergedDigestId> => {
    const useCase = new GetUseMergedDigestId(featureFlagServiceItem);

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

export const getIsApiRateLimitingEnabled = {
  provide: GetIsApiRateLimitingEnabled,
  useFactory: async (
    featureFlagsServiceItem: FeatureFlagsService
  ): Promise<GetIsApiRateLimitingEnabled> => {
    const useCase = new GetIsApiRateLimitingEnabled(featureFlagsServiceItem);

    return useCase;
  },
  inject: [FeatureFlagsService],
};

export const getIsApiIdempotencyEnabled = {
  provide: GetIsApiIdempotencyEnabled,
  useFactory: async (
    featureFlagsServiceItem: FeatureFlagsService
  ): Promise<GetIsApiIdempotencyEnabled> => {
    const useCase = new GetIsApiIdempotencyEnabled(featureFlagsServiceItem);

    return useCase;
  },
  inject: [FeatureFlagsService],
};

export const cacheInMemoryProviderService = {
  provide: CacheInMemoryProviderService,
  useFactory: (): CacheInMemoryProviderService => {
    return new CacheInMemoryProviderService();
  },
};

export const cacheService = {
  provide: CacheService,
  useFactory: async (): Promise<CacheService> => {
    const factoryCacheInMemoryProviderService =
      cacheInMemoryProviderService.useFactory();

    const service = new CacheService(factoryCacheInMemoryProviderService);

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
    const factoryCacheInMemoryProviderService =
      cacheInMemoryProviderService.useFactory();

    const service = new DistributedLockService(
      factoryCacheInMemoryProviderService
    );

    await service.initialize();

    return service;
  },
};
