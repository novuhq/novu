import { JobEntity, NotificationEntity } from '@novu/dal';

type TriggerPayload = Record<string, unknown> | undefined;

type JobPayloadFields = Pick<JobEntity, 'payload'>;
type NotificationPayloadFields = Pick<NotificationEntity, 'payload'>;

/**
 * Any document that denormalizes a trigger payload from a parent notification
 * (jobs, messages). Under payload-dedup the payload may be absent and must be
 * resolved from the notification via `_notificationId`.
 */
export interface IPayloadCarrier {
  payload?: unknown;
  _notificationId?: string;
  _environmentId: string;
}

/**
 * Marker object stored inside `digest.events` when the payload-dedup model is
 * active. Instead of copying the full trigger payload of every merged event,
 * we keep a reference to the parent notification and resolve the payload at
 * read time (see {@link resolveDigestEventsPayloads}).
 */
export interface IDigestEventPayloadRef {
  __payloadRef: true;
  _jobId: string;
  _notificationId: string;
  time: string;
}

/**
 * The two shapes an entry in the persisted `digest.events` array can take:
 * an inline trigger payload (legacy, or when a job carries its own payload) or
 * a lightweight notification reference resolved at read time.
 */
export type DigestStoredEvent = Record<string, unknown> | IDigestEventPayloadRef;

export function isDigestEventPayloadRef(event: unknown): event is IDigestEventPayloadRef {
  return typeof event === 'object' && event !== null && (event as IDigestEventPayloadRef).__payloadRef === true;
}

/**
 * Effective trigger payload for a job under the payload-dedup model.
 *
 * All-or-nothing semantics: a present `job.payload` is complete and
 * authoritative (legacy jobs, snooze/attachment jobs), so it is returned as-is
 * without touching the notification. Otherwise the payload lives on the parent
 * notification.
 */
export function getEffectiveJobPayload(
  job: JobPayloadFields,
  notification?: NotificationPayloadFields | null
): TriggerPayload {
  return job.payload ?? notification?.payload;
}

/**
 * Builds a single stored `digest.events` entry for a job.
 *
 * A job that still carries its own payload (legacy jobs, or when payload-dedup
 * is off) is stored inline as before. A job without a payload (payload-dedup)
 * is stored as a lightweight {@link IDigestEventPayloadRef} resolved at read
 * time via {@link resolveDigestEventsPayloads}.
 */
export function buildDigestEvent(
  job: Pick<JobEntity, '_id' | 'payload' | '_notificationId' | 'createdAt'>
): DigestStoredEvent {
  if (job.payload != null) {
    return job.payload;
  }

  return {
    __payloadRef: true,
    _jobId: job._id,
    _notificationId: job._notificationId,
    time: job.createdAt,
  } satisfies IDigestEventPayloadRef;
}
