import '../../src/config';

import { IntegrationRepository } from '@novu/dal';
import { agentInboxRoutingKeyPartialFilter } from '@novu/shared';

export const AGENT_INBOX_ROUTING_KEY_INDEX = 'credentials.inboxRoutingKey_1';

export interface AgentInboxRoutingKeyCollection {
  indexes: () => Promise<Array<{ name?: string; key?: Record<string, unknown> }>>;
  dropIndex: (name: string) => Promise<unknown>;
  createIndex: (
    keys: { 'credentials.inboxRoutingKey': 1 },
    options: {
      unique: true;
      name: string;
      partialFilterExpression: ReturnType<typeof agentInboxRoutingKeyPartialFilter>;
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
export async function recreateAgentInboxRoutingKeyIndex(collection: AgentInboxRoutingKeyCollection): Promise<void> {
  const indexes = await collection.indexes();
  const existing = indexes.find((index) => index.key?.['credentials.inboxRoutingKey'] === 1);

  if (existing?.name) {
    await collection.dropIndex(existing.name);
  }

  await collection.createIndex(
    { 'credentials.inboxRoutingKey': 1 },
    {
      unique: true,
      name: AGENT_INBOX_ROUTING_KEY_INDEX,
      partialFilterExpression: agentInboxRoutingKeyPartialFilter(),
    }
  );
}

export async function run(): Promise<void> {
  console.log('Start migration - recreate agent inbox routing key index for Agent Email Inbox');

  const collection = new IntegrationRepository()._model.collection;
  await recreateAgentInboxRoutingKeyIndex({
    indexes: () => collection.indexes(),
    dropIndex: (name) => collection.dropIndex(name),
    createIndex: (keys, options) => collection.createIndex(keys, options),
  });

  console.log('End migration.');
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
