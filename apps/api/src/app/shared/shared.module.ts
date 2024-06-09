import { Module } from '@nestjs/common';
import {
  ChangeRepository,
  CommunityMemberRepository,
  CommunityOrganizationRepository,
  CommunityUserRepository,
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
  CalculateDelayService,
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
} from '@novu/application-generic';

import * as packageJson from '../../../package.json';
import { JobTopicNameEnum } from '@novu/shared';
import { EE_REPOSITORIES } from '../auth/ee.auth.module.config';

const userRepositoryProvider = {
  provide: 'USER_REPOSITORY',
  useClass: CommunityUserRepository,
};

const memberRepositoryProvider = {
  provide: 'MEMBER_REPOSITORY',
  useClass: CommunityMemberRepository,
};

const organizationRepositoryProvider = {
  provide: 'ORGANIZATION_REPOSITORY',
  useClass: CommunityOrganizationRepository,
};

const COMMUNITY_REPOSITORIES = [userRepositoryProvider, memberRepositoryProvider, organizationRepositoryProvider];

const VERSION_SPECIFIC_DAL_MODELS = process.env.NOVU_ENTERPRISE ? EE_REPOSITORIES : COMMUNITY_REPOSITORIES;

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
  ...VERSION_SPECIFIC_DAL_MODELS,
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
  InvalidateCacheService,
  storageService,
  ...DAL_MODELS,
  ExecutionLogRoute,
  CreateExecutionDetails,
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
