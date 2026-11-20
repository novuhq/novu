import '../../src/config';

import { DalService, HumanInteraction } from '@novu/dal';
import {
  type CardChrome,
  type HumanInteractionContent,
  HumanInteractionKindEnum,
  type HumanInteractionOption,
  mintHumanOptions,
} from '@novu/shared';

const BATCH_SIZE = 500;

export interface LegacyHumanInteractionPromptDocument {
  _id: unknown;
  kind?: HumanInteractionKindEnum;
  prompt?: string;
  options?: HumanInteractionOption[];
  content?: HumanInteractionContent;
}

export interface HumanInteractionCardFromPromptUpdate {
  $set: { content: HumanInteractionContent };
  $unset: { prompt?: 1; options?: 1 };
}

/**
 * Fold leftover Mongo `prompt` / `options` into tagged `content`, then drop
 * those fields. Matches the pre-migration schema, which stored only `prompt`
 * (required) and optional `choose` `options`. Safe to re-run: rows that already
 * have `content` and no leftovers produce no update.
 */
export function buildHumanInteractionCardFromPromptUpdate(
  doc: LegacyHumanInteractionPromptDocument
): HumanInteractionCardFromPromptUpdate | null {
  const hasPrompt = doc.prompt !== undefined;
  const hasOptions = doc.options !== undefined;

  if (doc.content && !hasPrompt && !hasOptions) {
    return null;
  }

  if (!doc.kind) {
    return null;
  }

  const content = doc.content ?? contentFromLegacy(doc);
  if (!content) {
    return null;
  }

  const $unset: HumanInteractionCardFromPromptUpdate['$unset'] = {};
  if (hasPrompt) {
    $unset.prompt = 1;
  }

  if (hasOptions) {
    $unset.options = 1;
  }

  return {
    $set: { content },
    $unset,
  };
}

function contentFromLegacy(doc: LegacyHumanInteractionPromptDocument): HumanInteractionContent | null {
  const title = doc.prompt?.trim() || '';
  if (!title) {
    return null;
  }

  const chrome: CardChrome = { title };

  if (doc.kind === HumanInteractionKindEnum.CHOOSE) {
    // A legacy `choose` row with no options backfills `options: []`. That is
    // acceptable for this one-shot backfill — the row is already terminal or
    // orphaned, and downstream readers tolerate an empty option list.
    return {
      cardChrome: {
        ...chrome,
        options: mintHumanOptions(doc.options ?? []),
      },
    };
  }

  return { cardChrome: chrome };
}

type CardFromPromptCollection = {
  find: (filter: Record<string, unknown>) => {
    batchSize: (size: number) => AsyncIterable<LegacyHumanInteractionPromptDocument>;
  };
  bulkWrite: (
    operations: Array<{
      updateOne: { filter: { _id: unknown }; update: HumanInteractionCardFromPromptUpdate };
    }>
  ) => Promise<{ modifiedCount?: number }>;
};

const LEGACY_FIELD_FILTER = {
  $or: [{ prompt: { $exists: true } }, { options: { $exists: true } }],
};

export async function collapseHumanInteractionPromptOntoCard(collection: CardFromPromptCollection): Promise<{
  scanned: number;
  modified: number;
}> {
  let scanned = 0;
  let modified = 0;
  let batch: Array<{
    updateOne: { filter: { _id: unknown }; update: HumanInteractionCardFromPromptUpdate };
  }> = [];

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
    const update = buildHumanInteractionCardFromPromptUpdate(doc);
    if (!update) {
      continue;
    }

    batch.push({ updateOne: { filter: { _id: doc._id }, update } });
    if (batch.length >= BATCH_SIZE) {
      await flush();
    }
  }

  await flush();

  return { scanned, modified };
}

export async function run() {
  console.log('Start migration - fold HumanInteraction prompt/options/card onto content');

  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL is not set');
  }

  const dalService = new DalService();
  await dalService.connect(process.env.MONGO_URL);

  try {
    const result = await collapseHumanInteractionPromptOntoCard(
      HumanInteraction.collection as unknown as CardFromPromptCollection
    );

    console.log(`Backfilled HumanInteraction content: scanned ${result.scanned} modified ${result.modified}`);
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
