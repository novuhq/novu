import { JobEntity, NotificationEntity } from '@novu/dal';
import { TriggerOverrides } from '@novu/shared';

/**
 * Effective trigger overrides for a job under the overrides-dedup model.
 *
 * All-or-nothing semantics, same as {@link getEffectiveJobPayload}: a present
 * `job.overrides` (legacy jobs, or jobs written while the flag is off) is
 * authoritative even when empty. Otherwise the overrides live on the parent
 * notification.
 */
export function getEffectiveJobOverrides(
  job: Pick<JobEntity, 'overrides'>,
  notification?: Pick<NotificationEntity, 'overrides'> | null
): TriggerOverrides {
  return job.overrides ?? notification?.overrides ?? {};
}
