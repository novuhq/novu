import { ProcessSubscriber } from './process-subscriber/process-subscriber.usecase';
import { TriggerEvent } from './trigger-event';
import { SendMessage } from './send-message/send-message.usecase';
import { SendMessageSms } from './send-message/send-message-sms.usecase';
import { SendMessageEmail } from './send-message/send-message-email.usecase';
import { SendMessageInApp } from './send-message/send-message-in-app.usecase';
import { QueueNextJob } from './queue-next-job/queue-next-job.usecase';
import { Digest } from './send-message/digest.usecase';
import { CancelDigest } from './cancel-digest/cancel-digest.usecase';
import { FilterSteps } from './filter-steps/filter-steps.usecase';
import { FilterStepsBackoff } from './filter-steps/filter-steps-backoff.usecase';
import { FilterStepsRegular } from './filter-steps/filter-steps-regular.usecase';

export const USE_CASES = [
  TriggerEvent,
  ProcessSubscriber,
  SendMessage,
  SendMessageSms,
  SendMessageEmail,
  SendMessageInApp,
  QueueNextJob,
  Digest,
  CancelDigest,
  FilterSteps,
  FilterStepsRegular,
  FilterStepsBackoff,
];
