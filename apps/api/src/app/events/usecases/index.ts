import { CancelDelayed } from './cancel-delayed';
import { ParseEventRequest } from './parse-event-request';
import { ProcessBulkTrigger } from './process-bulk-trigger';
import { ResumeWait } from './resume-wait';
import { SendTestEmail } from './send-test-email';
import { TriggerEventToAll } from './trigger-event-to-all';

export const USE_CASES = [
  CancelDelayed,
  ResumeWait,
  TriggerEventToAll,
  ParseEventRequest,
  ProcessBulkTrigger,
  SendTestEmail,
];
