import { ProcessSubscriber } from './process-subscriber';
import { TriggerEvent } from './trigger-event';
import { SendMessage } from './send-message/send-message.usecase';
import { SendMessageSms } from './send-message/send-message-sms.usecase';
import { SendMessageEmail } from './send-message/send-message-email.usecase';
import { SendMessageInApp } from './send-message/send-message-in-app.usecase';
import { SendMessageChat } from './send-message/send-message-chat.usecase';
import { SendMessagePush } from './send-message/send-message-push.usecase';
import { Digest } from './send-message/digest/digest.usecase';
import { CancelDelayed } from './cancel-delayed/cancel-delayed.usecase';
import { TriggerEventToAll } from './trigger-event-to-all/trigger-event-to-all.usecase';
import { VerifyPayload } from './verify-payload/verify-payload.usecase';
import { RunJob } from './run-job/run-job.usecase';
import { SendTestEmail } from './send-message/';
import { MapTriggerRecipients, MapTriggerRecipientsCommand } from './map-trigger-recipients';
import { MessageMatcher } from './message-matcher';
import { ParseEventRequest } from './parse-event-request/parse-event-request.usecase';
import { ProcessBulkTrigger } from './process-bulk-trigger/process-bulk-trigger.usecase';
import { ProcessNotification } from './process-notification/process-notification.usecase';

export const USE_CASES = [
  MessageMatcher,
  TriggerEvent,
  ProcessNotification,
  SendMessage,
  SendMessageSms,
  SendMessageEmail,
  SendMessageInApp,
  SendMessageChat,
  SendMessagePush,
  Digest,
  CancelDelayed,
  TriggerEventToAll,
  VerifyPayload,
  RunJob,
  SendTestEmail,
  MapTriggerRecipients,
  ParseEventRequest,
  ProcessBulkTrigger,
  ProcessSubscriber,
];
