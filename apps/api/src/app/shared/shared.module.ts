/* eslint-disable global-require */
import { Module } from '@nestjs/common';
import {
  ChangeRepository,
  ControlValuesRepository,
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
  PreferencesRepository,
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
  CreateExecutionDetails,
  createNestLoggingModuleOptions,
  DalServiceHealthIndicator,
  distributedLockService,
  ExecuteBridgeRequest,
  ExecutionLogRoute,
  featureFlagsService,
  GetDecryptedSecretKey,
  getFeatureFlag,
  injectCommunityAuthProviders,
  InvalidateCacheService,
  LoggerModule,
  QueuesModule,
  storageService,
} from '@novu/application-generic';

import { isClerkEnabled, JobTopicNameEnum } from '@novu/shared';
import { JwtModule } from '@nestjs/jwt';
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
  ControlValuesRepository,
  PreferencesRepository,
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
  GetDecryptedSecretKey,
];

const IMPORTS = [
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
