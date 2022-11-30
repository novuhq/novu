import { ProcessSubscriber } from './process-subscriber/process-subscriber.usecase';
import { TriggerEvent } from './trigger-event';
import { SendMessage } from './send-message/send-message.usecase';
import { SendMessageSms } from './send-message/send-message-sms.usecase';
import { SendMessageEmail } from './send-message/send-message-email.usecase';
import { SendMessageInApp } from './send-message/send-message-in-app.usecase';
import { SendMessageChat } from './send-message/send-message-chat.usecase';
import { SendMessagePush } from './send-message/send-message-push.usecase';
import { QueueNextJob } from './queue-next-job/queue-next-job.usecase';
import { Digest } from './send-message/digest/digest.usecase';
import { CancelDelayed } from './cancel-delayed/cancel-delayed.usecase';
import { TriggerEventToAll } from './trigger-event-to-all/trigger-event-to-all.usecase';
import { DigestFilterSteps } from './digest-filter-steps/digest-filter-steps.usecase';
import { DigestFilterStepsBackoff } from './digest-filter-steps/digest-filter-steps-backoff.usecase';
import { DigestFilterStepsRegular } from './digest-filter-steps/digest-filter-steps-regular.usecase';
import { GetDigestEventsRegular } from './send-message/digest/get-digest-events-regular.usecase';
import { GetDigestEventsBackoff } from './send-message/digest/get-digest-events-backoff.usecase';
import { VerifyPayload } from './verify-payload/verify-payload.usecase';
import { RunJob } from './run-job/run-job.usecase';
import { AddJob } from './add-job/add-job.usecase';
import { AddDigestJob } from './add-job/add-digest-job.usecase';
import { AddDelayJob } from './add-job/add-delay-job.usecase';
import { ShouldAddDigestJob } from './add-job/should-add-digest-job.usecase';
import { SendMessageDelay } from './send-message/send-message-delay.usecase';
import { SendTestEmail } from './send-message/test-send-email.usecase';

export const USE_CASES = [
  TriggerEvent,
  ProcessSubscriber,
  SendMessage,
  SendMessageSms,
  SendMessageEmail,
  SendMessageInApp,
  SendMessageChat,
  SendMessagePush,
  QueueNextJob,
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
  ShouldAddDigestJob,
  SendMessageDelay,
  SendTestEmail,
];
