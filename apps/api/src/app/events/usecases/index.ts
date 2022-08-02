import { ProcessSubscriber } from './process-subscriber/process-subscriber.usecase';
import { TriggerEvent } from './trigger-event';
import { SendMessage } from './send-message/send-message.usecase';
import { SendMessageSms } from './send-message/send-message-sms.usecase';
import { SendMessageEmail } from './send-message/send-message-email.usecase';
import { SendMessageInApp } from './send-message/send-message-in-app.usecase';
import { SendMessageDirect } from './send-message/send-message-direct.usecase';
import { SendMessagePush } from './send-message/send-message-push.usecase';
import { QueueNextJob } from './queue-next-job/queue-next-job.usecase';
import { Digest } from './send-message/digest/digest.usecase';
import { CancelDigest } from './cancel-digest/cancel-digest.usecase';
import { TriggerEventToAll } from './trigger-event-to-all/trigger-event-to-all.usecase';
import { FilterSteps } from './filter-steps/filter-steps.usecase';
import { FilterStepsBackoff } from './filter-steps/filter-steps-backoff.usecase';
import { FilterStepsRegular } from './filter-steps/filter-steps-regular.usecase';
import { GetDigestEventsRegular } from './send-message/digest/get-digest-events-regular.usecase';
import { GetDigestEventsBackoff } from './send-message/digest/get-digest-events-backoff.usecase';

export const USE_CASES = [
  TriggerEvent,
  ProcessSubscriber,
  SendMessage,
  SendMessageSms,
  SendMessageEmail,
  SendMessageInApp,
  SendMessageDirect,
  SendMessagePush,
  QueueNextJob,
  Digest,
  CancelDigest,
  TriggerEventToAll,
  FilterSteps,
  FilterStepsRegular,
  FilterStepsBackoff,
  GetDigestEventsBackoff,
  GetDigestEventsRegular,
];
