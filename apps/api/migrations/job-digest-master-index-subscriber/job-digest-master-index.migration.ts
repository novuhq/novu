import '../../src/config';

import { DalService, Job } from '@novu/dal';

export const DIGEST_MASTER_GUARD_INDEX_NAME =
  'Guard from having two master jobs for same digest key, digest value, workflow and subscriber';

/**
 * Must stay in sync with the guard index in
 * `libs/dal/src/repositories/job/job.schema.ts`.
 *
 * The legacy definition keyed on the external `subscriberId` string while
 * `JobRepository.getExistingDelayedJobWithTheSameDigestValue` filters by the
 * internal `_subscriberId` ObjectId, so a subscriber deleted and re-created
 * with the same external ID could neither find nor create a digest master.
 * The corrected definition keys on `_subscriberId`.
 */
export const NEW_DIGEST_MASTER_GUARD_INDEX_KEY = {
  _subscriberId: 1,
  _environmentId: 1,
  'digest.digestValue': 1,
  'digest.digestKey': 1,
  _templateId: 1,
  status: 1,
  type: 1,
} as const;

export const NEW_DIGEST_MASTER_GUARD_INDEX_OPTIONS = {
  name: DIGEST_MASTER_GUARD_INDEX_NAME,
  unique: true,
  partialFilterExpression: {
    status: 'delayed',
    type: 'digest',
    createdAt: { $gte: new Date('2025-03-05T00:00:01.505+00:00') },
    'digest.digestValue': { $exists: true },
    'digest.digestKey': { $exists: true },
  },
} as const;

export interface JobIndexDescription {
  name?: string;
  key: Record<string, unknown>;
}

type JobIndexCollection = {
  indexes: () => Promise<JobIndexDescription[]>;
  dropIndex: (name: string) => Promise<unknown>;
  createIndex: (key: Record<string, unknown>, options: Record<string, unknown>) => Promise<string>;
};

/**
 * True only for the stale definition: same index name but still keyed on the
 * external `subscriberId` string. Returns false for the corrected definition
 * (keyed on `_subscriberId`) so re-runs are safe no-ops for the drop step.
 */
export function isLegacyDigestMasterIndex(index: JobIndexDescription): boolean {
  if (index.name !== DIGEST_MASTER_GUARD_INDEX_NAME) {
    return false;
  }

  return index.key.subscriberId !== undefined && index.key._subscriberId === undefined;
}

/**
 * Drops the legacy guard index (same name, wrong key) and (re)creates it with
 * the corrected `_subscriberId` key. Safe to re-run: a missing index on drop
 * (code 27) is tolerated, and `createIndex` with an identical spec is a
 * no-op when the corrected index already exists.
 *
 * Run before relying on the new schema definition: with
 * `MONGO_AUTO_CREATE_INDEXES=true` MongoDB rejects a same-name,
 * different-key index at startup, and with it disabled the stale
 * `subscriberId` index would otherwise remain and keep rejecting inserts.
 */
export async function migrateJobDigestMasterIndex(collection: JobIndexCollection): Promise<{
  droppedLegacyIndex: boolean;
  createdIndexName: string;
}> {
  let droppedLegacyIndex = false;
  const indexes = await collection.indexes();

  if (indexes.some(isLegacyDigestMasterIndex)) {
    try {
      await collection.dropIndex(DIGEST_MASTER_GUARD_INDEX_NAME);
      droppedLegacyIndex = true;
    } catch (error) {
      const code = (error as { code?: number }).code;
      if (code !== 27) {
        throw error;
      }
    }
  }

  const createdIndexName = await collection.createIndex(
    { ...NEW_DIGEST_MASTER_GUARD_INDEX_KEY },
    { ...NEW_DIGEST_MASTER_GUARD_INDEX_OPTIONS }
  );

  return { droppedLegacyIndex, createdIndexName };
}

export async function run() {
  console.log('Start migration - job delayed-digest master guard index to _subscriberId');

  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL is not set');
  }

  const dalService = new DalService();
  await dalService.connect(process.env.MONGO_URL);

  try {
    const collection = Job.collection;
    const result = await migrateJobDigestMasterIndex({
      indexes: () => collection.indexes(),
      dropIndex: (name: string) => collection.dropIndex(name),
      createIndex: (key: Record<string, unknown>, options: Record<string, unknown>) =>
        collection.createIndex(key, options),
    });

    console.log(
      `Migrated job digest master guard index: dropped legacy index: ${result.droppedLegacyIndex}, index: ${result.createdIndexName}`
    );
    console.log('End migration.');
  } finally {
    await dalService.disconnect();
  }
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
