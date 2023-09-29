import { CancelDelayed } from './cancel-delayed';
import { TriggerEventToAll } from './trigger-event-to-all';
import { VerifyPayload } from './verify-payload';
import { MapTriggerRecipients } from './map-trigger-recipients';
import { ParseEventRequest } from './parse-event-request';
import { ProcessBulkTrigger } from './process-bulk-trigger';

export const USE_CASES = [
  CancelDelayed,
  TriggerEventToAll,
  VerifyPayload,
  MapTriggerRecipients,
  ParseEventRequest,
  ProcessBulkTrigger,
];
