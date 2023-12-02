import { Module, OnModuleDestroy, Provider } from '@nestjs/common';
import {
  AddDelayJob,
  MergeOrCreateDigest,
  AddJob,
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
} from '@novu/application-generic';
import { JobRepository } from '@novu/dal';

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

import { ACTIVE_WORKERS, SharedModule } from '../shared/shared.module';

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

const PROVIDERS: Provider[] = [];
const activeWorkersToken: any = {
  provide: 'ACTIVE_WORKERS',
  useFactory: (...args: any[]) => {
    return args;
  },
  inject: ACTIVE_WORKERS,
};

@Module({
  imports: [SharedModule],
  controllers: [],
  providers: [...ACTIVE_WORKERS, ...PROVIDERS, ...USE_CASES, ...REPOSITORIES, activeWorkersToken],
  exports: [...PROVIDERS, ...USE_CASES, ...REPOSITORIES, activeWorkersToken],
})
export class WorkflowModule {}
