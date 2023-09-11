import { Module, Provider } from '@nestjs/common';
import {
  AddDelayJob,
  AddDigestJob,
  AddJob,
  BullMqService,
  bullMqTokenList,
  BulkCreateExecutionDetails,
  CalculateLimitNovuIntegration,
  CompileEmailTemplate,
  CompileTemplate,
  CreateExecutionDetails,
  CreateSubscriber,
  GetDecryptedIntegrations,
  GetLayoutUseCase,
  GetNovuLayout,
  GetNovuProviderCredentials,
  GetSubscriberPreference,
  GetSubscriberTemplatePreference,
  ProcessTenant,
  OldInstanceBullMqService,
  QueuesModule,
  SelectIntegration,
  SendTestEmail,
  SendTestEmailCommand,
  StoreSubscriberJobs,
  TriggerEvent,
  UpdateSubscriber,
} from '@novu/application-generic';
import { JobRepository, MessageRepository, OrganizationRepository, SubscriberRepository } from '@novu/dal';

import { JobMetricService, StandardWorker, WorkflowWorker, OldInstanceWorkflowWorker } from './services';
import {
  MessageMatcher,
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

import { CreateLog } from '../shared/logs';
import { SharedModule } from '../shared/shared.module';

const REPOSITORIES = [JobRepository];

const USE_CASES = [
  AddDelayJob,
  AddDigestJob,
  AddJob,
  CalculateLimitNovuIntegration,
  CompileEmailTemplate,
  CompileTemplate,
  CreateExecutionDetails,
  Digest,
  GetDecryptedIntegrations,
  GetDigestEventsBackoff,
  GetDigestEventsRegular,
  GetLayoutUseCase,
  GetNovuLayout,
  GetNovuProviderCredentials,
  SelectIntegration,
  GetSubscriberPreference,
  GetSubscriberTemplatePreference,
  HandleLastFailedJob,
  MessageMatcher,
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
];

const PROVIDERS: Provider[] = [
  BullMqService,
  bullMqTokenList,
  StandardWorker,
  WorkflowWorker,
  OldInstanceBullMqService,
  OldInstanceWorkflowWorker,
];

@Module({
  imports: [SharedModule, QueuesModule],
  controllers: [],
  providers: [...PROVIDERS, ...USE_CASES, ...REPOSITORIES],
})
export class WorkflowModule {}
