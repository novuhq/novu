import { CancelDelayed } from './cancel-delayed';
import { CompleteDelayed } from './complete-delayed';
import { ParseEventRequest } from './parse-event-request';
import { ProcessBulkTrigger } from './process-bulk-trigger';
import { SendTestEmail } from './send-test-email';
import { TriggerEventToAll } from './trigger-event-to-all';

export const USE_CASES = [
  CancelDelayed,
  CompleteDelayed,
  TriggerEventToAll,
  ParseEventRequest,
  ProcessBulkTrigger,
  SendTestEmail,
];
