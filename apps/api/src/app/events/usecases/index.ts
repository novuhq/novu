import { CancelDelayed } from './cancel-delayed';
import { ParseEventRequest } from './parse-event-request';
import { ProcessBulkTrigger } from './process-bulk-trigger';
import { SendTestEmail } from './send-test-email';
import { TriggerEventToAll } from './trigger-event-to-all';
import { VerifyPayload } from './verify-payload';

export const USE_CASES = [
  CancelDelayed,
  TriggerEventToAll,
  VerifyPayload,
  ParseEventRequest,
  ProcessBulkTrigger,
  SendTestEmail,
];
