/* eslint-disable global-require */
import { Module } from '@nestjs/common';
import {
  ChangeRepository,
  ControlVariablesRepository,
  DalService,
  EnvironmentRepository,
  ExecutionDetailsRepository,
  FeedRepository,
  IntegrationRepository,
  JobRepository,
  LayoutRepository,
  LogRepository,
  MemberRepository,
  MessageRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationRepository,
  NotificationTemplateRepository,
  OrganizationRepository,
  SubscriberPreferenceRepository,
  SubscriberRepository,
  TenantRepository,
  TopicRepository,
  TopicSubscribersRepository,
  UserRepository,
  WorkflowOverrideRepository,
} from '@novu/dal';
import {
  analyticsService,
  cacheService,
  CacheServiceHealthIndicator,
  ComputeJobWaitDurationService,
  createNestLoggingModuleOptions,
  DalServiceHealthIndicator,
  distributedLockService,
  featureFlagsService,
  getFeatureFlag,
  InvalidateCacheService,
  LoggerModule,
  QueuesModule,
  storageService,
  ExecutionLogRoute,
  CreateExecutionDetails,
  injectCommunityAuthProviders,
  ExecuteBridgeRequest,
} from '@novu/application-generic';

import { JobTopicNameEnum, isClerkEnabled } from '@novu/shared';
import packageJson from '../../../package.json';

function getDynamicAuthProviders() {
  if (isClerkEnabled()) {
    const eeAuthPackage = require('@novu/ee-auth');

    return eeAuthPackage.injectEEAuthProviders();
  } else {
    return injectCommunityAuthProviders();
  }
}

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
  WorkflowOverrideRepository,
  ControlVariablesRepository,
  ...getDynamicAuthProviders(),
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
  ComputeJobWaitDurationService,
  dalService,
  DalServiceHealthIndicator,
  distributedLockService,
  featureFlagsService,
  InvalidateCacheService,
  storageService,
  ...DAL_MODELS,
  ExecutionLogRoute,
  CreateExecutionDetails,
  ExecuteBridgeRequest,
  getFeatureFlag,
];

@Module({
  imports: [
    QueuesModule.forRoot([
      JobTopicNameEnum.EXECUTION_LOG,
      JobTopicNameEnum.WEB_SOCKETS,
      JobTopicNameEnum.WORKFLOW,
      JobTopicNameEnum.INBOUND_PARSE_MAIL,
    ]),
    LoggerModule.forRoot(
      createNestLoggingModuleOptions({
        serviceName: packageJson.name,
        version: packageJson.version,
      })
    ),
  ],
  providers: [...PROVIDERS],
  exports: [...PROVIDERS, LoggerModule, QueuesModule],
})
export class SharedModule {}
