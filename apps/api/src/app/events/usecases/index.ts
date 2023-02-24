import { ProcessSubscriber } from './process-subscriber';
import { TriggerEvent } from './trigger-event';
import {
  SendMessage,
  SendMessageChat,
  SendMessageDelay,
  SendMessageEmail,
  SendMessageInApp,
  SendMessagePush,
  SendMessageSms,
  SendTestEmail,
} from './send-message';
import { Digest } from './send-message/digest/digest.usecase';
import { GetDigestEventsRegular } from './send-message/digest/get-digest-events-regular.usecase';
import { GetDigestEventsBackoff } from './send-message/digest/get-digest-events-backoff.usecase';
import { QueueNextJob } from './queue-next-job';
import { CreateNotificationJobs } from './create-notification-jobs';
import { CancelDelayed } from './cancel-delayed';
import { TriggerEventToAll } from './trigger-event-to-all';
import { DigestFilterSteps, DigestFilterStepsBackoff, DigestFilterStepsRegular } from './digest-filter-steps';
import { VerifyPayload } from './verify-payload';
import { RunJob } from './run-job';
import { AddDelayJob, AddDigestJob, AddJob } from './add-job';
import { MapTriggerRecipients } from './map-trigger-recipients';
import { MessageMatcher } from './message-matcher';
import { ParseEventRequest } from './parse-event-request';
import { ProcessBulkTrigger } from './process-bulk-trigger';

export const USE_CASES = [
  MessageMatcher,
  TriggerEvent,
  ProcessSubscriber,
  SendMessage,
  SendMessageSms,
  SendMessageEmail,
  SendMessageInApp,
  SendMessageChat,
  SendMessagePush,
  QueueNextJob,
  CreateNotificationJobs,
  Digest,
  CancelDelayed,
  TriggerEventToAll,
  DigestFilterSteps,
  DigestFilterStepsRegular,
  DigestFilterStepsBackoff,
  GetDigestEventsBackoff,
  GetDigestEventsRegular,
  VerifyPayload,
  RunJob,
  AddJob,
  AddDigestJob,
  AddDelayJob,
  SendMessageDelay,
  SendTestEmail,
  MapTriggerRecipients,
  ParseEventRequest,
  ProcessBulkTrigger,
];
