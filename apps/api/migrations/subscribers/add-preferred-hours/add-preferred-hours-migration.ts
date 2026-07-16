import '../../../src/config';

import { NestFactory } from '@nestjs/core';
import { PinoLogger } from '@novu/application-generic';
import { SubscriberRepository } from '@novu/dal';
import { AppModule } from '../../../src/app.module';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const VALID_CHANNEL_KEYS = new Set(['in_app', 'email', 'sms', 'chat', 'push']);
const VALID_POLICIES = new Set(['respect', 'always']);

type UpdateManyFn = (
  filter: Record<string, unknown>,
  update: Record<string, unknown>
) => Promise<{ matchedCount: number; modifiedCount: number }>;

/**
 * Safe preferredHours migration for existing subscribers.
 *
 * Design notes (from local MongoDB inspection of subscriber docs):
 * - No production top-level `preferredHours` field exists today (0 affected rows
 *   in local novu-db at channel-overrides rollout; only start/end samples).
 * - Older/test shapes may carry unrelated keys (`hours`, `schedule`,
 *   `preferredContactTime`) or nest similar names under `data` — those are
 *   NOT the schema field and must not be promoted.
 * - Absence of `preferredHours` already means "no restriction". We intentionally
 *   do NOT set a default window on existing rows.
 * - Optional `channelOverrides` is additive: existing `{ start, end }` docs
 *   remain valid (all channels default to `respect`).
 *
 * This migration only cleans invalid top-level `preferredHours` values so a
 * corrupted shape cannot break the worker send path. Valid values are left alone.
 */
export async function sanitizeInvalidPreferredHours(updateMany: UpdateManyFn): Promise<{
  invalidCleared: { matchedCount: number; modifiedCount: number };
}> {
  // Clear preferredHours when it exists but is not a { start, end } object with HH:mm strings.
  // Mongo cannot fully express HH:mm regex + object shape in a single portable filter,
  // so we clear clearly-invalid types and leave object shapes for the optional deep scan below.
  const invalidCleared = await updateMany(
    {
      preferredHours: { $exists: true, $not: { $type: 'object' } },
    },
    {
      $unset: { preferredHours: '' },
    }
  );

  return { invalidCleared };
}

/**
 * Cursor-based deep sanitize for object-shaped preferredHours with bad fields.
 * Safe to re-run. Existing valid windows are preserved; missing field stays missing
 * (no restriction).
 */
export async function sanitizeMalformedPreferredHoursObjects(
  findCursor: () => AsyncIterable<{
    _id: unknown;
    _environmentId?: unknown;
    preferredHours?: unknown;
  }>,
  updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>) => Promise<void>
): Promise<{ processed: number; cleared: number }> {
  let processed = 0;
  let cleared = 0;

  for await (const doc of findCursor()) {
    processed += 1;
    if (isValidPreferredHoursShape(doc.preferredHours)) {
      continue;
    }

    await updateOne(
      {
        _id: doc._id,
        ...(doc._environmentId ? { _environmentId: doc._environmentId } : {}),
      },
      { $unset: { preferredHours: '' } }
    );
    cleared += 1;
  }

  return { processed, cleared };
}

export function isValidPreferredHoursShape(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.start !== 'string' || typeof record.end !== 'string') {
    return false;
  }

  if (!HH_MM.test(record.start) || !HH_MM.test(record.end)) {
    return false;
  }

  if (record.channelOverrides !== undefined && !isValidChannelOverridesShape(record.channelOverrides)) {
    return false;
  }

  return true;
}

export function isValidChannelOverridesShape(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  for (const [key, policy] of Object.entries(value as Record<string, unknown>)) {
    if (!VALID_CHANNEL_KEYS.has(key)) {
      return false;
    }
    if (!VALID_POLICIES.has(policy as string)) {
      return false;
    }
  }

  return true;
}

export async function run() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const logger = await app.resolve(PinoLogger);
  logger.setContext('AddPreferredHoursMigration');
  const subscriberRepository = app.get(SubscriberRepository);

  logger.info('start migration - sanitize preferredHours on subscribers (no default window)');

  const typeResult = await sanitizeInvalidPreferredHours((filter, update) =>
    subscriberRepository._model.collection.updateMany(filter, update).then((r) => ({
      matchedCount: r.matchedCount,
      modifiedCount: r.modifiedCount,
    }))
  );

  logger.info(
    `cleared non-object preferredHours: matched ${typeResult.invalidCleared.matchedCount}, modified ${typeResult.invalidCleared.modifiedCount}`
  );

  const cursor = subscriberRepository._model
    .find({ preferredHours: { $exists: true, $type: 'object' } })
    .select({ _id: 1, _environmentId: 1, preferredHours: 1 })
    .batchSize(500)
    .cursor();

  const objectResult = await sanitizeMalformedPreferredHoursObjects(
    () => cursor as AsyncIterable<{ _id: unknown; _environmentId?: unknown; preferredHours?: unknown }>,
    async (filter, update) => {
      await subscriberRepository._model.collection.updateOne(filter, update);
    }
  );

  logger.info(
    `deep sanitize preferredHours objects: processed ${objectResult.processed}, cleared ${objectResult.cleared}`
  );
  logger.info(
    'end migration - existing subscribers without preferredHours remain unrestricted (field absent)'
  );

  await app.close();
}

if (require.main === module) {
  run()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed', error);
      process.exit(1);
    });
}
