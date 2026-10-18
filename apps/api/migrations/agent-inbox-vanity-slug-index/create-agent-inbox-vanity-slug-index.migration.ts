import '../../src/config';

import {
  AGENT_INBOX_VANITY_SLUG_INDEX,
  AGENT_INBOX_VANITY_SLUG_INDEX_KEYS,
  AGENT_INBOX_VANITY_SLUG_PARTIAL_FILTER,
  DalService,
  IntegrationRepository,
} from '@novu/dal';

/**
 * Unique claim for Agent Inbox addresses. A vanity row has no routing key, so
 * it occupies `(slug, domain, null)`. A keyed row occupies its own key and
 * does not block the bare handle.
 */
export async function run(): Promise<void> {
  console.log('Start migration - create agent inbox vanity slug index');

  if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL is not set');
  }

  const dalService = new DalService();
  await dalService.connect(process.env.MONGO_URL);

  try {
    const collection = new IntegrationRepository()._model.collection;
    await collection.createIndex(AGENT_INBOX_VANITY_SLUG_INDEX_KEYS, {
      unique: true,
      name: AGENT_INBOX_VANITY_SLUG_INDEX,
      partialFilterExpression: AGENT_INBOX_VANITY_SLUG_PARTIAL_FILTER,
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
