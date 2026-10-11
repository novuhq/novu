import '../../src/config';

import { DalService, IntegrationRepository } from '@novu/dal';
import { agentInboxRoutingKeyPartialFilter } from '@novu/shared';

export const AGENT_INBOX_ROUTING_KEY_INDEX = 'credentials.inboxRoutingKey_1';

export interface AgentInboxRoutingKeyIndex {
  name?: string;
  key?: Record<string, unknown>;
  unique?: boolean;
  partialFilterExpression?: Record<string, unknown>;
}

export interface AgentInboxRoutingKeyCollection {
  indexes: () => Promise<AgentInboxRoutingKeyIndex[]>;
  dropIndex: (name: string) => Promise<unknown>;
  createIndex: (
    keys: { 'credentials.inboxRoutingKey': 1 },
    options: {
      unique: boolean;
      name: string;
      partialFilterExpression?: Record<string, unknown>;
    }
  ) => Promise<string>;
}

/**
 * MongoDB cannot change a partial filter in place (IndexOptionsConflict 85).
 * Drop the routing-key index and recreate it so Agent Email Inbox rows share
 * uniqueness with Novu Email. Uniqueness is unenforced between the drop and
 * the rebuild; the key space makes a collision in that window impractical,
 * but run this outside a provisioning burst.
 */
function isTargetRoutingKeyIndex(index: AgentInboxRoutingKeyIndex): boolean {
  if (index.unique === false) {
    return false;
  }

  const filter = index.partialFilterExpression as
    | {
        providerId?: { $in?: string[] };
        'credentials.inboxRoutingKey'?: { $type?: string };
      }
    | undefined;
  const actual = filter?.providerId?.$in;
  if (!actual || filter?.['credentials.inboxRoutingKey']?.$type !== 'string') {
    return false;
  }

  const expected = [...agentInboxRoutingKeyPartialFilter().providerId.$in].sort();
  const providers = [...actual].sort();

  return providers.length === expected.length && providers.every((providerId, i) => providerId === expected[i]);
}

/**
 * Drop the old index only after we know a rebuild is required. If the widened
 * index cannot be created, put the previous index back so routing keys are
 * not left without a uniqueness check.
 */
export async function recreateAgentInboxRoutingKeyIndex(collection: AgentInboxRoutingKeyCollection): Promise<void> {
  const indexes = await collection.indexes();
  const existing = indexes.find((index) => index.key?.['credentials.inboxRoutingKey'] === 1);

  if (existing && isTargetRoutingKeyIndex(existing)) {
    return;
  }

  if (existing?.name) {
    await collection.dropIndex(existing.name);
  }

  try {
    await collection.createIndex(
      { 'credentials.inboxRoutingKey': 1 },
      {
        unique: true,
        name: AGENT_INBOX_ROUTING_KEY_INDEX,
        partialFilterExpression: agentInboxRoutingKeyPartialFilter(),
      }
    );
  } catch (error) {
    if (existing?.name) {
      try {
        await collection.createIndex(
          { 'credentials.inboxRoutingKey': 1 },
          {
            unique: existing.unique !== false,
            name: existing.name,
            ...(existing.partialFilterExpression ? { partialFilterExpression: existing.partialFilterExpression } : {}),
          }
        );
      } catch (restoreError) {
        const reason = restoreError instanceof Error ? restoreError.message : String(restoreError);
        const original = error instanceof Error ? error.message : String(error);

        throw new Error(
          `Failed to create the widened routing-key index (${original}) and could not restore ${existing.name}: ${reason}`
        );
      }
    }

    throw error;
  }
}

export async function run(): Promise<void> {
  console.log('Start migration - recreate agent inbox routing key index for Agent Email Inbox');

  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL is not set');
  }

  const dalService = new DalService();
  await dalService.connect(process.env.MONGO_URL);

  try {
    const collection = new IntegrationRepository()._model.collection;
    await recreateAgentInboxRoutingKeyIndex({
      indexes: () => collection.indexes(),
      dropIndex: (name) => collection.dropIndex(name),
      createIndex: (keys, options) => collection.createIndex(keys, options),
    });

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
