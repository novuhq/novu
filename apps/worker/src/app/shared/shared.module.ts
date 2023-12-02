import { Module, Provider } from '@nestjs/common';
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
  DigestFilterStepsBackoff,
  DigestFilterStepsRegular,
  DigestFilterStepsTimed,
  distributedLockService,
  EventsDistributedLockService,
  featureFlagsService,
  GetTenant,
  getUseMergedDigestId,
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
import { ActiveJobsMetricService, ExecutionLogWorker, StandardWorker, WorkflowWorker } from '../workflow/services';
import { SubscriberProcessWorker } from '../workflow/services/subscriber-process.worker';
import { WorkflowModule } from '../workflow/workflow.module';

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
  DigestFilterStepsBackoff,
  DigestFilterStepsRegular,
  DigestFilterStepsTimed,
  distributedLockService,
  EventsDistributedLockService,
  featureFlagsService,
  getUseMergedDigestId,
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

const validQueueEntries = Object.keys(JobTopicNameEnum).map((key) => JobTopicNameEnum[key]);
const queuesToProcess =
  process.env.WORKER_QUEUES?.split(',').map((queue) => {
    const queueName = queue.trim();
    if (!validQueueEntries.includes(queueName)) {
      throw new Error(`Invalid queue name ${queueName}`);
    }

    return queueName;
  }) || [];

export const ACTIVE_WORKERS: Provider[] | any[] = [];

const WORKER_MAPPING = {
  [JobTopicNameEnum.STANDARD]: {
    workerClass: StandardWorker,
    queueDependencies: [JobTopicNameEnum.EXECUTION_LOG, JobTopicNameEnum.WEB_SOCKETS, JobTopicNameEnum.STANDARD],
  },
  [JobTopicNameEnum.WORKFLOW]: {
    workerClass: WorkflowWorker,
    queueDependencies: [JobTopicNameEnum.EXECUTION_LOG, JobTopicNameEnum.PROCESS_SUBSCRIBER],
  },
  [JobTopicNameEnum.EXECUTION_LOG]: {
    workerClass: ExecutionLogWorker,
    queueDependencies: [],
  },
  [JobTopicNameEnum.PROCESS_SUBSCRIBER]: {
    workerClass: SubscriberProcessWorker,
    queueDependencies: [JobTopicNameEnum.EXECUTION_LOG],
  },
};

const QUEUE_DEPENDENCIES = queuesToProcess.reduce((history, queue) => {
  const queueDependencies = WORKER_MAPPING[queue]?.queueDependencies || [];

  return [...history, ...queueDependencies];
}, []);

const UNIQUE_QUEUE_DEPENDENCIES = [...new Set(QUEUE_DEPENDENCIES)];

if (!queuesToProcess.length) {
  ACTIVE_WORKERS.push(StandardWorker, WorkflowWorker, ExecutionLogWorker, SubscriberProcessWorker);
} else {
  queuesToProcess.forEach((queue) => {
    ACTIVE_WORKERS.push(WORKER_MAPPING[queue].workerClass);
  });
}

@Module({
  imports: [
    MetricsModule,
    QueuesModule.forRoot(
      queuesToProcess?.length ? [JobTopicNameEnum.ACTIVE_JOBS_METRIC, ...UNIQUE_QUEUE_DEPENDENCIES] : undefined
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
