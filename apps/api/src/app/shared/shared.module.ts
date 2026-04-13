import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  analyticsService,
  CacheServiceHealthIndicator,
  CloudflareSchedulerService,
  ComputeJobWaitDurationService,
  CreateExecutionDetails,
  cacheService,
  clickHouseService,
  createNestLoggingModuleOptions,
  DalServiceHealthIndicator,
  DeliveryTrendCountsRepository,
  ExecuteBridgeRequest,
  ExecuteFrameworkRequest,
  ExecuteStepResolverRequest,
  featureFlagsService,
  GetDecryptedSecretKey,
  HttpClientService,
  InMemoryLRUCacheService,
  InvalidateCacheService,
  LoggerModule,
  QueuesModule,
  RequestLogRepository,
  StepRunRepository,
  storageService,
  TraceLogRepository,
  TraceRollupRepository,
  WorkflowRunCountRepository,
  WorkflowRunRepository,
} from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChangeRepository,
  CommunityMemberRepository,
  CommunityOrganizationRepository,
  CommunityUserRepository,
  ControlValuesRepository,
  DalService,
  EnvironmentRepository,
  EnvironmentVariableRepository,
  ExecutionDetailsRepository,
  FeedRepository,
  IntegrationRepository,
  JobRepository,
  LayoutRepository,
  MemberRepository,
  MessageRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationRepository,
  NotificationTemplateRepository,
  OrganizationRepository,
  PreferencesRepository,
  SubscriberRepository,
  TenantRepository,
  TopicRepository,
  TopicSubscribersRepository,
  UserRepository,
  WorkflowOverrideRepository,
} from '@novu/dal';
import { isClerkEnabled, JobTopicNameEnum } from '@novu/shared';
import packageJson from '../../../package.json';

function getDynamicAuthProviders() {
  if (isClerkEnabled()) {
    const eeAuthPackage = require('@novu/ee-auth');

    return eeAuthPackage.injectEEAuthProviders();
  } else {
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

    return [userRepositoryProvider, memberRepositoryProvider, organizationRepositoryProvider];
  }
}

const DAL_MODELS = [
  UserRepository,
  OrganizationRepository,
  CommunityOrganizationRepository,
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
  IntegrationRepository,
  ChangeRepository,
  JobRepository,
  FeedRepository,
  TopicRepository,
  TopicSubscribersRepository,
  TenantRepository,
  WorkflowOverrideRepository,
  ControlValuesRepository,
  PreferencesRepository,
  EnvironmentVariableRepository,
  AgentRepository,
  AgentIntegrationRepository,
];

const dalService = {
  provide: DalService,
  useFactory: async () => {
    const service = new DalService();
    await service.connect(process.env.MONGO_URL || '.');

    return service;
  },
};

const ANALYTICS_PROVIDERS = [
  // Repositories
  RequestLogRepository,
  TraceLogRepository,
  StepRunRepository,
  WorkflowRunRepository,
  WorkflowRunCountRepository,
  TraceRollupRepository,
  DeliveryTrendCountsRepository,

  // Services
  clickHouseService,
];

const PROVIDERS = [
  analyticsService,
  cacheService,
  CacheServiceHealthIndicator,
  CloudflareSchedulerService,
  ComputeJobWaitDurationService,
  dalService,
  DalServiceHealthIndicator,
  featureFlagsService,
  InMemoryLRUCacheService,
  InvalidateCacheService,
  storageService,
  ...DAL_MODELS,
  CreateExecutionDetails,
  ExecuteBridgeRequest,
  ExecuteFrameworkRequest,
  ExecuteStepResolverRequest,
  GetDecryptedSecretKey,
  HttpClientService,
  ...ANALYTICS_PROVIDERS,
];

const IMPORTS = [
  QueuesModule.forRoot([
    JobTopicNameEnum.WEB_SOCKETS,
    JobTopicNameEnum.WORKFLOW,
    JobTopicNameEnum.INBOUND_PARSE_MAIL,
    JobTopicNameEnum.STANDARD,
  ]),
  LoggerModule.forRoot(
    createNestLoggingModuleOptions({
      serviceName: packageJson.name,
      version: packageJson.version,
      silent: !!process.env.CI,
    })
  ),
];

if (process.env.NODE_ENV === 'test') {
  /**
   * This is here only because of the tests. These providers are available at AppModule level,
   * but since in tests we are often importing just the SharedModule and not the entire AppModule
   * we need to make sure these providers are available.
   *
   * TODO: modify tests to either import all services they need explicitly, or remove repositories from SharedModule,
   * and then import SharedModule + repositories explicitly.
   */
  PROVIDERS.push(...getDynamicAuthProviders());
  IMPORTS.push(
    JwtModule.register({
      secret: `${process.env.JWT_SECRET}`,
      signOptions: {
        expiresIn: 360000,
      },
    })
  );
}

@Module({
  imports: [...IMPORTS],
  providers: [...PROVIDERS],
  exports: [...PROVIDERS, LoggerModule, QueuesModule],
})
export class SharedModule {}
