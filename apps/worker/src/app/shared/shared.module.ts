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
  InMemoryProviderService,
  StorageHelperService,
  StorageService,
  GCSStorageService,
  AzureBlobStorageService,
  S3StorageService,
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

const distributedLockService = {
  provide: DistributedLockService,
  useFactory: () => {
    const factoryInMemoryProviderService = inMemoryProviderService.useFactory();

    return new DistributedLockService(factoryInMemoryProviderService);
  },
};

const PROVIDERS = [
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
    provide: WsQueueService,
    useClass: WsQueueService,
  },
  {
    provide: StorageService,
    useClass: getStorageServiceClass(),
  },
  StorageHelperService,
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
