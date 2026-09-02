import '../../src/config';

import { DalService, HumanInteraction } from '@novu/dal';

const BATCH_SIZE = 500;

const MIRRORED_FIELDS = [
  'subscriberId',
  'integrationIdentifier',
  'platform',
  'platformMessageId',
  'platformThreadId',
] as const;

export interface LegacyHumanInteractionDocument {
  _id: unknown;
  subscriberId?: string;
  subscriberIds?: string[];
  integrationIdentifier?: string;
  platform?: string;
  platformMessageId?: string;
  platformThreadId?: string;
  deliveries?: Array<{
    subscriberId: string;
    integrationIdentifier: string;
    platform: string;
    platformMessageId: string;
    platformThreadId: string;
  }>;
}

export interface HumanInteractionCollapseUpdate {
  $set?: Record<string, unknown>;
  $unset?: Record<string, 1>;
}

function resolveSubscriberIds(doc: LegacyHumanInteractionDocument): string[] {
  if (Array.isArray(doc.subscriberIds) && doc.subscriberIds.length > 0) {
    return doc.subscriberIds;
  }

  if (doc.subscriberId) {
    return [doc.subscriberId];
  }

  return [];
}

/**
 * Backfill `deliveries` / `subscriberIds` from the mirrored top-level fields
 * NV-8697 dual-wrote, then drop those fields. Safe to re-run: already-collapsed
 * rows produce no update.
 *
 * Run after the NV-8703 deploy — older API processes still read the mirrored
 * fields and would miss them if this unsets first.
 */
export function buildHumanInteractionCollapseUpdate(
  doc: LegacyHumanInteractionDocument
): HumanInteractionCollapseUpdate | null {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};

  const subscriberIds = resolveSubscriberIds(doc);

  if ((!doc.subscriberIds || doc.subscriberIds.length === 0) && subscriberIds.length > 0) {
    $set.subscriberIds = subscriberIds;
  }

  const hasDeliveries = Array.isArray(doc.deliveries) && doc.deliveries.length > 0;
  if (!hasDeliveries && doc.platformMessageId && doc.platformThreadId) {
    const subscriberId = subscriberIds[0];
    if (subscriberId && doc.integrationIdentifier && doc.platform) {
      $set.deliveries = [
        {
          subscriberId,
          integrationIdentifier: doc.integrationIdentifier,
          platform: doc.platform,
          platformMessageId: doc.platformMessageId,
          platformThreadId: doc.platformThreadId,
        },
      ];
    }
  }

  for (const field of MIRRORED_FIELDS) {
    if (doc[field] !== undefined) {
      $unset[field] = 1;
    }
  }

  if (Object.keys($set).length === 0 && Object.keys($unset).length === 0) {
    return null;
  }

  return {
    ...(Object.keys($set).length > 0 ? { $set } : {}),
    ...(Object.keys($unset).length > 0 ? { $unset } : {}),
  };
}

export function selectLegacyHumanInteractionIndexNames(
  indexes: Array<{ name: string; key: Record<string, unknown> }>
): string[] {
  return indexes
    .filter((index) => {
      if (index.key.subscriberId !== undefined) {
        return true;
      }

      return index.key.platformMessageId !== undefined && index.key['deliveries.platformMessageId'] === undefined;
    })
    .map((index) => index.name);
}

type CollapseCollection = {
  find: (filter: Record<string, unknown>) => {
    batchSize: (size: number) => AsyncIterable<LegacyHumanInteractionDocument>;
  };
  bulkWrite: (
    operations: Array<{ updateOne: { filter: { _id: unknown }; update: HumanInteractionCollapseUpdate } }>
  ) => Promise<{ modifiedCount?: number }>;
  indexes: () => Promise<Array<{ name: string; key: Record<string, unknown> }>>;
  dropIndex: (name: string) => Promise<unknown>;
};

const LEGACY_FIELD_FILTER = {
  $or: [
    { subscriberId: { $exists: true } },
    { integrationIdentifier: { $exists: true } },
    { platform: { $exists: true } },
    { platformMessageId: { $exists: true } },
    { platformThreadId: { $exists: true } },
    { subscriberIds: { $exists: false } },
    { subscriberIds: { $size: 0 } },
    { deliveries: { $exists: false } },
    { deliveries: { $eq: [] } },
  ],
};

export async function collapseHumanInteractionMirroredFields(collection: CollapseCollection): Promise<{
  scanned: number;
  modified: number;
  droppedIndexes: string[];
}> {
  let scanned = 0;
  let modified = 0;
  let batch: Array<{ updateOne: { filter: { _id: unknown }; update: HumanInteractionCollapseUpdate } }> = [];

  async function flush(): Promise<void> {
    if (batch.length === 0) {
      return;
    }

    const result = await collection.bulkWrite(batch);
    modified += result.modifiedCount ?? batch.length;
    batch = [];
  }

  for await (const doc of collection.find(LEGACY_FIELD_FILTER).batchSize(BATCH_SIZE)) {
    scanned += 1;
    const update = buildHumanInteractionCollapseUpdate(doc);
    if (!update) {
      continue;
    }

    batch.push({ updateOne: { filter: { _id: doc._id }, update } });
    if (batch.length >= BATCH_SIZE) {
      await flush();
    }
  }

  await flush();

  const droppedIndexes: string[] = [];
  const indexes = await collection.indexes();
  for (const name of selectLegacyHumanInteractionIndexNames(indexes)) {
    try {
      await collection.dropIndex(name);
      droppedIndexes.push(name);
    } catch (error) {
      const code = (error as { code?: number }).code;
      if (code !== 27) {
        throw error;
      }
    }
  }

  return { scanned, modified, droppedIndexes };
}

export async function run() {
  console.log('Start migration - collapse HumanInteraction mirrored fields onto deliveries');

  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL is not set');
  }

  const dalService = new DalService();
  await dalService.connect(process.env.MONGO_URL);

  try {
    const result = await collapseHumanInteractionMirroredFields(
      HumanInteraction.collection as unknown as CollapseCollection
    );

    console.log(
      `Backfilled HumanInteraction rows: scanned ${result.scanned} modified ${result.modified}; dropped indexes: ${
        result.droppedIndexes.join(', ') || 'none'
      }`
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
