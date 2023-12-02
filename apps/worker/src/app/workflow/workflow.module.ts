import { Module, OnModuleDestroy, Provider } from '@nestjs/common';
import {
  AddDelayJob,
  MergeOrCreateDigest,
  AddJob,
  bullMqTokenList,
  BulkCreateExecutionDetails,
  CalculateLimitNovuIntegration,
  CompileEmailTemplate,
  CompileTemplate,
  CreateExecutionDetails,
  GetDecryptedIntegrations,
  GetLayoutUseCase,
  GetNovuLayout,
  GetNovuProviderCredentials,
  GetSubscriberPreference,
  GetSubscriberGlobalPreference,
  GetSubscriberTemplatePreference,
  ProcessTenant,
  SelectIntegration,
  SendTestEmail,
  SendTestEmailCommand,
  StoreSubscriberJobs,
  ConditionsFilter,
  TriggerEvent,
  SelectVariant,
  MapTriggerRecipients,
  GetTopicSubscribersUseCase,
  getIsTopicNotificationEnabled,
  SubscriberJobBound,
  TriggerBroadcast,
  TriggerMulticast,
  MetricsModule,
} from '@novu/application-generic';
import { JobRepository } from '@novu/dal';

import { ExecutionLogWorker, ActiveJobsMetricService, StandardWorker, WorkflowWorker } from './services';

import {
  SendMessage,
  SendMessageChat,
  SendMessageDelay,
  SendMessageEmail,
  SendMessageInApp,
  SendMessagePush,
  SendMessageSms,
  Digest,
  GetDigestEventsBackoff,
  GetDigestEventsRegular,
  HandleLastFailedJob,
  QueueNextJob,
  RunJob,
  SetJobAsCompleted,
  SetJobAsFailed,
  UpdateJobStatus,
  WebhookFilterBackoffStrategy,
} from './usecases';

import { SharedModule } from '../shared/shared.module';
import { SubscriberProcessWorker } from './services/subscriber-process.worker';
import { JobTopicNameEnum } from '@novu/shared';

const REPOSITORIES = [JobRepository];

const USE_CASES = [
  AddDelayJob,
  MergeOrCreateDigest,
  AddJob,
  CalculateLimitNovuIntegration,
  CompileEmailTemplate,
  CompileTemplate,
  CreateExecutionDetails,
  ConditionsFilter,
  BulkCreateExecutionDetails,
  Digest,
  GetDecryptedIntegrations,
  GetDigestEventsBackoff,
  GetDigestEventsRegular,
  GetLayoutUseCase,
  GetNovuLayout,
  GetNovuProviderCredentials,
  SelectIntegration,
  SelectVariant,
  GetSubscriberPreference,
  GetSubscriberGlobalPreference,
  GetSubscriberTemplatePreference,
  HandleLastFailedJob,
  ProcessTenant,
  QueueNextJob,
  RunJob,
  SendMessage,
  SendMessageChat,
  SendMessageDelay,
  SendMessageEmail,
  SendMessageInApp,
  SendMessagePush,
  SendMessageSms,
  SendTestEmail,
  SendTestEmailCommand,
  StoreSubscriberJobs,
  SetJobAsCompleted,
  SetJobAsFailed,
  TriggerEvent,
  UpdateJobStatus,
  WebhookFilterBackoffStrategy,
  MapTriggerRecipients,
  GetTopicSubscribersUseCase,
  getIsTopicNotificationEnabled,
  SubscriberJobBound,
  TriggerBroadcast,
  TriggerMulticast,
];

const PROVIDERS: Provider[] = [ActiveJobsMetricService, bullMqTokenList];

const validQueueEntries = Object.keys(JobTopicNameEnum).map((key) => JobTopicNameEnum[key]);
const queuesToProcess =
  process.env.WORKER_QUEUES?.split(',').map((queue) => {
    const queueName = queue.trim();
    if (!validQueueEntries.includes(queueName)) {
      throw new Error(`Invalid queue name ${queueName}`);
    }

    return queueName;
  }) || [];

if (queuesToProcess?.includes(JobTopicNameEnum.STANDARD)) {
  PROVIDERS.push(StandardWorker);
}

if (!queuesToProcess.length) {
  PROVIDERS.push(StandardWorker, WorkflowWorker, ExecutionLogWorker, SubscriberProcessWorker);
} else {
  queuesToProcess.forEach((queue) => {
    switch (queue) {
      case JobTopicNameEnum.STANDARD:
        PROVIDERS.push(StandardWorker);
        break;
      case JobTopicNameEnum.WORKFLOW:
        PROVIDERS.push(WorkflowWorker);
        break;
      case JobTopicNameEnum.EXECUTION_LOG:
        PROVIDERS.push(ExecutionLogWorker);
        break;
      case JobTopicNameEnum.PROCESS_SUBSCRIBER:
        PROVIDERS.push(SubscriberProcessWorker);
        break;
    }
  });
}

@Module({
  imports: [SharedModule, MetricsModule],
  controllers: [],
  providers: [...PROVIDERS, ...USE_CASES, ...REPOSITORIES],
})
export class WorkflowModule {}
