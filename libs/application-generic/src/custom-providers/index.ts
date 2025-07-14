import { DalService } from '@novu/dal';
import { PinoLogger } from 'nestjs-pino';
import {
  AnalyticsService,
  CacheInMemoryProviderService,
  CacheService,
  FeatureFlagsService,
  ClickHouseService,
} from '../services';

export const featureFlagsService = {
  provide: FeatureFlagsService,
  useFactory: async (): Promise<FeatureFlagsService> => {
    const instance = new FeatureFlagsService();
    await instance.initialize();

    return instance;
  },
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
    const factoryCacheInMemoryProviderService = cacheInMemoryProviderService.useFactory();

    const service = new CacheService(factoryCacheInMemoryProviderService);

    await service.initialize();

    return service;
  },
};

export const dalService = {
  provide: DalService,
  useFactory: async () => {
    const service = new DalService();
    await service.connect(String(process.env.MONGO_URL));

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

export const clickHouseService = {
  provide: ClickHouseService,
  useFactory: async (logger: PinoLogger) => {
    const service = new ClickHouseService(logger);
    await service.init();

    return service;
  },
  inject: [PinoLogger],
};
