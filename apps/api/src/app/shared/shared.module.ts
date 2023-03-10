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
import { AnalyticsService } from '@novu/application-generic';
import { ConnectionOptions } from 'tls';

import { DistributedLockService } from './services/distributed-lock';
import { PerformanceService } from './services/performance';
import { QueueService } from './services/queue';
import {
  AzureBlobStorageService,
  GCSStorageService,
  S3StorageService,
  StorageService,
} from './services/storage/storage.service';
import { CacheService, InvalidateCacheService } from './services/cache';

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

export const ANALYTICS_SERVICE = 'AnalyticsService';

const cacheService = {
  provide: CacheService,
  useFactory: async () => {
    return new CacheService({
      host: process.env.REDIS_CACHE_SERVICE_HOST,
      port: process.env.REDIS_CACHE_SERVICE_PORT || '6379',
      ttl: process.env.REDIS_CACHE_TTL,
      password: process.env.REDIS_CACHE_PASSWORD,
      connectTimeout: process.env.REDIS_CACHE_CONNECTION_TIMEOUT,
      keepAlive: process.env.REDIS_CACHE_KEEP_ALIVE,
      family: process.env.REDIS_CACHE_FAMILY,
      keyPrefix: process.env.REDIS_CACHE_KEY_PREFIX,
      tls: process.env.REDIS_CACHE_SERVICE_TLS as ConnectionOptions,
    });
  },
};

const PROVIDERS = [
  {
    provide: DistributedLockService,
    useFactory: () => {
      return new DistributedLockService();
    },
  },
  {
    provide: QueueService,
    useFactory: () => {
      return new QueueService();
    },
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
  cacheService,
  InvalidateCacheService,
  ...DAL_MODELS,
  {
    provide: StorageService,
    useClass: getStorageServiceClass(),
  },
  {
    provide: ANALYTICS_SERVICE,
    useFactory: async () => {
      const analyticsService = new AnalyticsService(process.env.SEGMENT_TOKEN);

      await analyticsService.initialize();

      return analyticsService;
    },
  },
];

@Module({
  imports: [],
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class SharedModule {}
