import { Module } from '@nestjs/common';
import {
  ChangeRepository,
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
  BulkCreateExecutionDetails,
  cacheService,
  CalculateDelayService,
  CreateExecutionDetails,
  createNestLoggingModuleOptions,
  CreateNotificationJobs,
  CreateSubscriber,
  CreateTenant,
  DalServiceHealthIndicator,
  DigestFilterSteps,
  distributedLockService,
  EventsDistributedLockService,
  featureFlagsService,
  GetTenant,
  InvalidateCacheService,
  LoggerModule,
  MetricsModule,
  ProcessSubscriber,
  ProcessTenant,
  QueuesModule,
  StorageHelperService,
  storageService,
  UpdateSubscriber,
  UpdateTenant,
} from '@novu/application-generic';

import * as packageJson from '../../../package.json';
import { CreateLog } from './logs';
import { JobTopicNameEnum } from '@novu/shared';
import { ActiveJobsMetricService } from '../workflow/services';
import { UNIQUE_WORKER_DEPENDENCIES, workersToProcess } from '../../config/worker-init.config';

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
  distributedLockService,
  EventsDistributedLockService,
  featureFlagsService,
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
  ActiveJobsMetricService,
];

@Module({
  imports: [
    MetricsModule,
    QueuesModule.forRoot(
      UNIQUE_WORKER_DEPENDENCIES.length
        ? [JobTopicNameEnum.ACTIVE_JOBS_METRIC, ...UNIQUE_WORKER_DEPENDENCIES]
        : undefined
    ),
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
