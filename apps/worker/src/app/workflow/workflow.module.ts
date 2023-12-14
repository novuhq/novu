import { Module, OnApplicationShutdown, Provider } from '@nestjs/common';
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
  WorkflowInMemoryProviderService,
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

import { SharedModule } from '../shared/shared.module';
import { ACTIVE_WORKERS } from '../../config/worker-init.config';

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

const memoryQueueService = {
  provide: WorkflowInMemoryProviderService,
  useFactory: async () => {
    const memoryService = new WorkflowInMemoryProviderService();

    await memoryService.initialize();

    return memoryService;
  },
};

@Module({
  imports: [SharedModule],
  controllers: [],
  providers: [memoryQueueService, ...ACTIVE_WORKERS, ...PROVIDERS, ...USE_CASES, ...REPOSITORIES, activeWorkersToken],
  exports: [...PROVIDERS, ...USE_CASES, ...REPOSITORIES, activeWorkersToken],
})
export class WorkflowModule implements OnApplicationShutdown {
  constructor(private workflowInMemoryProviderService: WorkflowInMemoryProviderService) {}

  async onApplicationShutdown() {
    await this.workflowInMemoryProviderService.shutdown();
  }
}
