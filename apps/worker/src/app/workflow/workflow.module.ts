import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
import {
  AddDelayJob,
  MergeOrCreateDigest,
  AddJob,
  BullMqService,
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
  QueuesModule,
  SelectIntegration,
  SendTestEmail,
  SendTestEmailCommand,
  StoreSubscriberJobs,
  ConditionsFilter,
  TriggerEvent,
  MapTriggerRecipients,
  GetTopicSubscribersUseCase,
  getIsTopicNotificationEnabled,
  SubscriberJobBound,
} from '@novu/application-generic';
import { JobRepository } from '@novu/dal';

import { ActiveJobsMetricService, CompletedJobsMetricService, StandardWorker, WorkflowWorker } from './services';

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

import { SharedModule } from '../shared/shared.module';
import { SubscriberProcessWorker } from './services/subscriber-process.worker';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';

const enterpriseImports = (): Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> => {
  const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [];
  try {
    if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
      if (require('@novu/ee-translation')?.EnterpriseTranslationModule) {
        modules.push(require('@novu/ee-translation')?.EnterpriseTranslationModule);
      }
    }
  } catch (e) {
    Logger.error(e, `Unexpected error while importing enterprise modules`, 'EnterpriseImport');
  }

  return modules;
};
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
  GetSubscriberPreference,
  GetSubscriberGlobalPreference,
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
  MapTriggerRecipients,
  GetTopicSubscribersUseCase,
  getIsTopicNotificationEnabled,
  SubscriberJobBound,
];

const PROVIDERS: Provider[] = [
  ActiveJobsMetricService,
  BullMqService,
  bullMqTokenList,
  CompletedJobsMetricService,
  StandardWorker,
  WorkflowWorker,
  SubscriberProcessWorker,
];

@Module({
  imports: [SharedModule, QueuesModule, ...enterpriseImports()],
  controllers: [],
  providers: [...PROVIDERS, ...USE_CASES, ...REPOSITORIES],
})
export class WorkflowModule {}
