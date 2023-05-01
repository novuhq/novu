import {
  DigestFilterSteps,
  DigestFilterStepsBackoff,
  DigestFilterStepsRegular,
  AddJob,
  AddDelayJob,
  AddDigestJob,
  TriggerEvent,
  ProcessSubscriber,
  CreateNotificationJobs,
  StoreSubscriberJobs,
} from '@novu/application-generic';

import { CancelDelayed } from './cancel-delayed';
import { TriggerEventToAll } from './trigger-event-to-all';
import { VerifyPayload } from './verify-payload';
import { MapTriggerRecipients } from './map-trigger-recipients';
import { ParseEventRequest } from './parse-event-request';
import { ProcessBulkTrigger } from './process-bulk-trigger';

export const USE_CASES = [
  TriggerEvent,
  ProcessSubscriber,
  CreateNotificationJobs,
  CancelDelayed,
  TriggerEventToAll,
  DigestFilterSteps,
  DigestFilterStepsRegular,
  DigestFilterStepsBackoff,
  VerifyPayload,
  AddJob,
  AddDelayJob,
  AddDigestJob,
  MapTriggerRecipients,
  ParseEventRequest,
  ProcessBulkTrigger,
  StoreSubscriberJobs,
];
