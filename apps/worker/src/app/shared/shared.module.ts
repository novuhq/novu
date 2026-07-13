import { Module } from '@nestjs/common';
import {
  analyticsService,
  BulkCreateExecutionDetails,
  CloudflareSchedulerService,
  ComputeJobWaitDurationService,
  CreateExecutionDetails,
  CreateNotificationJobs,
  CreateOrUpdateSubscriberUseCase,
  CreateTenant,
  cacheService,
  clickHouseBatchService,
  clickHouseService,
  createNestLoggingModuleOptions,
  DalServiceHealthIndicator,
  DigestFilterSteps,
  ExecuteBridgeRequest,
  ExecuteFrameworkRequest,
  ExecuteStepResolverRequest,
  featureFlagsService,
  GetDecryptedSecretKey,
  GetTenant,
  HttpClientService,
  InboundMailRequestLogger,
  InMemoryLRUCacheService,
  InvalidateCacheService,
  LoggerModule,
  MetricsModule,
  ProcessTenant,
  QueuesModule,
  RequestLogRepository,
  SafeOutboundHttpService,
  StepRunRepository,
  StorageHelperService,
  storageService,
  TraceLogRepository,
  UpdateSubscriber,
  UpdateSubscriberChannel,
  UpdateTenant,
  WorkflowRunRepository,
  WorkflowRunService,
} from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  ControlValuesRepository,
  DalService,
  EnvironmentRepository,
  EnvironmentVariableRepository,
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
  AgentIntegrationRepository,
  EnvironmentRepository,
  EnvironmentVariableRepository,
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

    await service.connect(process.env.MONGO_URL!);

    return service;
  },
};

const ANALYTICS_PROVIDERS = [
  // Repositories
  TraceLogRepository,
  StepRunRepository,
  WorkflowRunRepository,
  RequestLogRepository,

  // Services
  clickHouseService,
  clickHouseBatchService,
  WorkflowRunService,

  // Inbound mail logging (shared with apps/inbound-mail; worker only writes
  // terminal completion traces so the tenant resolver is not needed here).
  InboundMailRequestLogger,
];

const PROVIDERS = [
  analyticsService,
  BulkCreateExecutionDetails,
  cacheService,
  CloudflareSchedulerService,
  ComputeJobWaitDurationService,
  CreateExecutionDetails,
  CreateNotificationJobs,
  CreateOrUpdateSubscriberUseCase,
  dalService,
  DalServiceHealthIndicator,
  DigestFilterSteps,
  featureFlagsService,
  InMemoryLRUCacheService,
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
  ExecuteFrameworkRequest,
  ExecuteStepResolverRequest,
  GetDecryptedSecretKey,
  HttpClientService,
  SafeOutboundHttpService,
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
