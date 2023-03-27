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

export const ANALYTICS_SERVICE = 'AnalyticsService';

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

const PROVIDERS = [
  {
    provide: ANALYTICS_SERVICE,
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
  {
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
        tls: process.env.REDIS_CACHE_SERVICE_TLS,
      });
    },
  },
  InvalidateCacheService,
  CreateLog,
  WsQueueService,
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
