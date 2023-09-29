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
  analyticsService,
  cacheService,
  CacheServiceHealthIndicator,
  CalculateDelayService,
  createNestLoggingModuleOptions,
  DalServiceHealthIndicator,
  distributedLockService,
  featureFlagsService,
  getIsMultiProviderConfigurationEnabled,
  getIsTopicNotificationEnabled,
  InvalidateCacheService,
  LoggerModule,
  QueuesModule,
  storageService,
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

const dalService = {
  provide: DalService,
  useFactory: async () => {
    const service = new DalService();
    await service.connect(process.env.MONGO_URL);

    return service;
  },
};

const PROVIDERS = [
  analyticsService,
  cacheService,
  CacheServiceHealthIndicator,
  CalculateDelayService,
  dalService,
  DalServiceHealthIndicator,
  distributedLockService,
  featureFlagsService,
  getIsMultiProviderConfigurationEnabled,
  getIsTopicNotificationEnabled,
  InvalidateCacheService,
  storageService,
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
    QueuesModule,
  ],
  providers: [...PROVIDERS],
  exports: [...PROVIDERS, LoggerModule, QueuesModule],
})
export class SharedModule {}
