import { ProcessSubscriber } from './process-subscriber/process-subscriber.usecase';
import { TriggerEvent } from './trigger-event';
import { SendMessage } from './send-message/send-message.usecase';
import { SendMessageSms } from './send-message/send-message-sms.usecase';
import { SendMessageEmail } from './send-message/send-message-email.usecase';
import { SendMessageInApp } from './send-message/send-message-in-app.usecase';
import { SendMessageDirect } from './send-message/send-message-direct.usecase';
import { QueueNextJob } from './queue-next-job/queue-next-job.usecase';
import { SendMessagePush } from './send-message/send-message-push.usecase';

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
];
