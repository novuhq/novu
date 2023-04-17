import { Module } from '@nestjs/common';
import {
  EventsPerformanceService,
  CreateExecutionDetails,
  CalculateLimitNovuIntegration,
  DigestFilterSteps,
  DigestFilterStepsRegular,
  DigestFilterStepsBackoff,
  GetDecryptedIntegrations,
  GetNovuIntegration,
  GetSubscriberPreference,
  GetSubscriberTemplatePreference,
  CompileEmailTemplate,
  CompileTemplate,
  GetLayoutUseCase,
  GetNovuLayout,
  QueueService,
  TriggerQueueService,
  AddJob,
  AddDelayJob,
  AddDigestJob,
  EventsDistributedLockService,
  SendTestEmail,
  SendTestEmailCommand,
  CreateSubscriber,
  UpdateSubscriber,
  TriggerEvent,
  CreateNotificationJobs,
  ProcessSubscriber,
  StoreSubscriberJobs,
  CalculateDelayService,
} from '@novu/application-generic';
import { JobRepository } from '@novu/dal';

import { SharedModule } from '../shared/shared.module';
import { WorkflowQueueService } from './services/workflow-queue.service';
import { TriggerProcessorQueueService } from './services/trigger-processor-queue.service';
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
  QueueNextJob,
  RunJob,
  SetJobAsCompleted,
  SetJobAsFailed,
  UpdateJobStatus,
  WebhookFilterBackoffStrategy,
} from './usecases';

const USE_CASES = [
  AddJob,
  AddDelayJob,
  AddDigestJob,
  CalculateLimitNovuIntegration,
  CreateExecutionDetails,
  GetDecryptedIntegrations,
  GetNovuIntegration,
  GetSubscriberPreference,
  GetSubscriberTemplatePreference,
  MessageMatcher,
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
  CompileEmailTemplate,
  CompileTemplate,
  Digest,
  GetDigestEventsBackoff,
  GetDigestEventsRegular,
  GetLayoutUseCase,
  GetNovuLayout,
  DigestFilterSteps,
  DigestFilterStepsRegular,
  DigestFilterStepsBackoff,
  SetJobAsCompleted,
  SetJobAsFailed,
  UpdateJobStatus,
  WebhookFilterBackoffStrategy,
  StoreSubscriberJobs,
  TriggerEvent,
  CreateNotificationJobs,
  ProcessSubscriber,
  CreateSubscriber,
  UpdateSubscriber,
];

const REPOSITORIES = [JobRepository];

const SERVICES = [
  {
    provide: QueueService,
    useClass: WorkflowQueueService,
  },
  {
    provide: TriggerQueueService,
    useClass: TriggerProcessorQueueService,
  },
  EventsDistributedLockService,
  EventsPerformanceService,
  CalculateDelayService,
];

@Module({
  imports: [SharedModule],
  controllers: [],
  providers: [...USE_CASES, ...REPOSITORIES, ...SERVICES],
})
export class WorkflowModule {}
