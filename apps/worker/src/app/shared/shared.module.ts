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
  BulkCreateExecutionDetails,
  cacheService,
  CalculateDelayService,
  CreateExecutionDetails,
  createNestLoggingModuleOptions,
  CreateNotificationJobs,
  CreateSubscriber,
  DalServiceHealthIndicator,
  DigestFilterSteps,
  DigestFilterStepsBackoff,
  DigestFilterStepsRegular,
  DigestFilterStepsTimed,
  distributedLockService,
  EventsDistributedLockService,
  featureFlagsService,
  getIsMultiProviderConfigurationEnabled,
  InvalidateCacheService,
  LoggerModule,
  ProcessSubscriber,
  StorageHelperService,
  storageService,
  UpdateSubscriber,
  UpdateTenant,
  GetTenant,
  CreateTenant,
  ProcessTenant,
  getUseMergedDigestId,
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
  BulkCreateExecutionDetails,
  cacheService,
  CalculateDelayService,
  CreateExecutionDetails,
  CreateLog,
  CreateNotificationJobs,
  CreateSubscriber,
  dalService,
  DalServiceHealthIndicator,
  DigestFilterSteps,
  DigestFilterStepsBackoff,
  DigestFilterStepsRegular,
  DigestFilterStepsTimed,
  distributedLockService,
  EventsDistributedLockService,
  featureFlagsService,
  getUseMergedDigestId,
  getIsMultiProviderConfigurationEnabled,
  InvalidateCacheService,
  ProcessSubscriber,
  StorageHelperService,
  storageService,
  UpdateSubscriber,
  UpdateTenant,
  GetTenant,
  CreateTenant,
  ProcessTenant,
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
