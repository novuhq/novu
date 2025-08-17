import { Module } from '@nestjs/common';
import {
  analyticsService,
  BulkCreateExecutionDetails,
  ComputeJobWaitDurationService,
  CreateExecutionDetails,
  CreateNotificationJobs,
  CreateOrUpdateSubscriberUseCase,
  CreateTenant,
  cacheService,
  clickHouseService,
  createNestLoggingModuleOptions,
  DalServiceHealthIndicator,
  DigestFilterSteps,
  ExecuteBridgeRequest,
  featureFlagsService,
  GetDecryptedSecretKey,
  GetTenant,
  InvalidateCacheService,
  LoggerModule,
  MetricsModule,
  ProcessTenant,
  QueuesModule,
  StepRunRepository,
  StorageHelperService,
  storageService,
  TraceLogRepository,
  UpdateSubscriber,
  UpdateSubscriberChannel,
  UpdateTenant,
  WorkflowRunRepository,
} from '@novu/application-generic';
import {
  ControlValuesRepository,
  DalService,
  EnvironmentRepository,
  ExecutionDetailsRepository,
  IntegrationRepository,
  JobRepository,
  LayoutRepository,
  MessageRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
  TenantRepository,
  TopicRepository,
  TopicSubscribersRepository,
  WorkflowOverrideRepository,
} from '@novu/dal';

import { JobTopicNameEnum } from '@novu/shared';
import packageJson from '../../../package.json';
import { UNIQUE_WORKER_DEPENDENCIES } from '../../config/worker-init.config';
import { ActiveJobsMetricService } from '../workflow/services';

const DAL_MODELS = [
  EnvironmentRepository,
  ExecutionDetailsRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
  NotificationRepository,
  MessageRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  LayoutRepository,
  IntegrationRepository,
  JobRepository,
  TopicRepository,
  TopicSubscribersRepository,
  TenantRepository,
  WorkflowOverrideRepository,
  ControlValuesRepository,
];

const dalService = {
  provide: DalService,
  useFactory: async () => {
    const service = new DalService();

    await service.connect(process.env.MONGO_URL);

    return service;
  },
};

const ANALYTICS_PROVIDERS = [
  // Repositories
  TraceLogRepository,
  StepRunRepository,
  WorkflowRunRepository,

  // Services
  clickHouseService,
];

const PROVIDERS = [
  analyticsService,
  BulkCreateExecutionDetails,
  cacheService,
  ComputeJobWaitDurationService,
  CreateExecutionDetails,
  CreateNotificationJobs,
  CreateOrUpdateSubscriberUseCase,
  dalService,
  DalServiceHealthIndicator,
  DigestFilterSteps,
  featureFlagsService,
  InvalidateCacheService,
  StorageHelperService,
  storageService,
  UpdateSubscriber,
  UpdateSubscriberChannel,
  UpdateTenant,
  GetTenant,
  CreateTenant,
  ProcessTenant,
  ...DAL_MODELS,
  ActiveJobsMetricService,
  ExecuteBridgeRequest,
  GetDecryptedSecretKey,
  ...ANALYTICS_PROVIDERS,
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
