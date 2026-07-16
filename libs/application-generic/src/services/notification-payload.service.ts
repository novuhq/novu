import { Injectable } from '@nestjs/common';
import { JobEntity, NotificationEntity, NotificationRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { DigestStoredEvent, getEffectiveJobPayload, IPayloadCarrier, isDigestEventPayloadRef } from '../utils/payload';
import { FeatureFlagsService } from './feature-flags';

type TriggerPayload = Record<string, unknown> | undefined;

type JobExecutionNotification = Pick<NotificationEntity, 'payload' | '_organizationId' | '_environmentId'>;

/**
 * Owns the notification-backed side of the payload-dedup model: resolving the
 * trigger payload for jobs/messages that no longer persist their own, and for
 * stored digest-event references. Pure, IO-free helpers (getEffectiveJobPayload,
 * buildDigestEvent, isDigestEventPayloadRef) live in `utils/payload`.
 */
@Injectable()
export class NotificationPayloadService {
  constructor(
    private notificationRepository: NotificationRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  /**
   * For the carriers missing a payload, loads their parent notifications
   * (grouped per environment so DAL enforcement stays correct across
   * environments) and returns a `_notificationId -> payload` map.
   */
  private async fetchNotificationPayloads(carriers: IPayloadCarrier[]): Promise<Map<string, TriggerPayload>> {
    const payloadByNotificationId = new Map<string, TriggerPayload>();

    const notificationIdsByEnvironment = new Map<string, Set<string>>();
    for (const carrier of carriers) {
      if (carrier.payload != null || !carrier._notificationId) {
        continue;
      }
      const notificationIds = notificationIdsByEnvironment.get(carrier._environmentId) ?? new Set<string>();
      notificationIds.add(carrier._notificationId);
      notificationIdsByEnvironment.set(carrier._environmentId, notificationIds);
    }

    for (const [environmentId, notificationIds] of notificationIdsByEnvironment.entries()) {
      const notifications = await this.notificationRepository.find(
        { _id: { $in: [...notificationIds] }, _environmentId: environmentId },
        '_id payload'
      );

      for (const notification of notifications) {
        payloadByNotificationId.set(notification._id, notification.payload);
      }
    }

    return payloadByNotificationId;
  }

  /**
   * Batch-hydrates the in-memory `payload` of payload carriers (jobs, messages)
   * that don't carry one, loading their parent notifications in one query per
   * environment. Carriers that already have a payload are left untouched
   * (presence means complete). Mutates the passed objects in place.
   */
  async hydrateEntitiesPayload<T extends IPayloadCarrier>(entities: T[]): Promise<void> {
    const payloadByNotificationId = await this.fetchNotificationPayloads(entities);

    if (payloadByNotificationId.size === 0) {
      return;
    }

    for (const entity of entities) {
      if (entity.payload == null && entity._notificationId) {
        entity.payload = payloadByNotificationId.get(entity._notificationId);
      }
    }
  }

  /**
   * Resolves a stored `digest.events` array into concrete trigger payloads.
   * Backward compatible: events stored before payload-dedup are raw payload
   * objects and pass through unchanged; {@link IDigestEventPayloadRef} entries
   * are resolved from their parent notification.
   */
  async resolveDigestEventsPayloads(
    events: DigestStoredEvent[] | undefined,
    environmentId: string
  ): Promise<Array<Record<string, unknown>> | undefined> {
    if (!events || events.length === 0) {
      return events as Array<Record<string, unknown>> | undefined;
    }

    const refs = events.filter(isDigestEventPayloadRef);

    if (refs.length === 0) {
      return events as Array<Record<string, unknown>>;
    }

    const notificationIds = [...new Set(refs.map((ref) => ref._notificationId))];
    const notifications = await this.notificationRepository.find(
      { _id: { $in: notificationIds }, _environmentId: environmentId },
      '_id payload'
    );
    const payloadByNotificationId = new Map<string, TriggerPayload>(
      notifications.map((notification) => [notification._id, notification.payload])
    );

    return events.map((event) => {
      if (!isDigestEventPayloadRef(event)) {
        return event;
      }

      return payloadByNotificationId.get(event._notificationId) ?? {};
    });
  }

  /**
   * Payload-dedup preparation for a job about to execute: hydrates
   * `job.payload` in place from the parent notification when absent (a present
   * payload is authoritative), resolves any digest-event references, and reads
   * the write-side `IS_PAYLOAD_DEDUP_ENABLED` flag once.
   */
  async prepareJobExecutionPayload(
    job: JobEntity,
    notification: JobExecutionNotification
  ): Promise<{ isPayloadDedupEnabled: boolean; digestEvents: Array<Record<string, unknown>> | undefined }> {
    job.payload = getEffectiveJobPayload(job, notification);

    const [isPayloadDedupEnabled, digestEvents] = await Promise.all([
      this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_PAYLOAD_DEDUP_ENABLED,
        organization: { _id: job._organizationId },
        defaultValue: false,
      }),
      this.resolveDigestEventsPayloads(job.digest?.events, job._environmentId),
    ]);

    return { isPayloadDedupEnabled, digestEvents };
  }
}
