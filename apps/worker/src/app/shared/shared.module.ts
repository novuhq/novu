import { Module } from '@nestjs/common';
import {
  analyticsService,
  BulkCreateExecutionDetails,
  cacheService,
  ComputeJobWaitDurationService,
  CreateExecutionDetails,
  createNestLoggingModuleOptions,
  CreateNotificationJobs,
  CreateSubscriber,
  CreateTenant,
  DalServiceHealthIndicator,
  DigestFilterSteps,
  distributedLockService,
  EventsDistributedLockService,
  ExecuteBridgeRequest,
  featureFlagsService,
  GetDecryptedSecretKey,
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
  UpdateSubscriberChannel,
  UpdateTenant,
} from '@novu/application-generic';
import {
  ControlValuesRepository,
  DalService,
  EnvironmentRepository,
  ExecutionDetailsRepository,
  IntegrationRepository,
  JobRepository,
  LayoutRepository,
  LogRepository,
  MessageRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationRepository,
  NotificationTemplateRepository,
  SubscriberPreferenceRepository,
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
import { CreateLog } from './logs';

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
  LogRepository,
  IntegrationRepository,
  JobRepository,
  SubscriberPreferenceRepository,
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

const PROVIDERS = [
  analyticsService,
  BulkCreateExecutionDetails,
  cacheService,
  ComputeJobWaitDurationService,
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
  UpdateSubscriberChannel,
  UpdateTenant,
  GetTenant,
  CreateTenant,
  ProcessTenant,
  ...DAL_MODELS,
  ActiveJobsMetricService,
  ExecuteBridgeRequest,
  GetDecryptedSecretKey,
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
