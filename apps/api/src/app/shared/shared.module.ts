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
import { AnalyticsService, createNestLoggingModuleOptions, LoggerModule } from '@novu/application-generic';
import { ConnectionOptions } from 'tls';

import { DistributedLockService } from './services/distributed-lock';
import { InMemoryProviderService } from './services/in-memory-provider';
import { PerformanceService } from './services/performance';
import { QueueService } from './services/queue';
import {
  AzureBlobStorageService,
  GCSStorageService,
  S3StorageService,
  StorageService,
} from './services/storage/storage.service';
import { CacheService, InvalidateCacheService } from './services/cache';
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

const inMemoryProviderService = {
  provide: InMemoryProviderService,
  useFactory: () => {
    return new InMemoryProviderService();
  },
};

const cacheService = {
  provide: CacheService,
  useFactory: () => {
    const factoryInMemoryProviderService = inMemoryProviderService.useFactory();

    return new CacheService(factoryInMemoryProviderService);
  },
};

const PROVIDERS = [
  inMemoryProviderService,
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
