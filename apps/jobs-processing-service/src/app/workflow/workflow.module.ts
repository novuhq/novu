import { Module } from '@nestjs/common';

import { SharedModule } from '../shared/shared.module';
import { EventsDistributedLockService } from './services/events-distributed-lock.service';
import { WorkflowQueueService } from './services/workflow-queue.service';
import { EventsPerformanceService } from './services/events-performance.service';
import {
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
];

const SERVICES = [WorkflowQueueService, EventsDistributedLockService, EventsPerformanceService];

@Module({
  imports: [SharedModule],
  controllers: [],
  providers: [...USE_CASES, ...SERVICES],
})
export class WorkflowModule {}
