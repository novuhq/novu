import '../../src/config';

import {
  AGENT_INBOX_VANITY_SLUG_INDEX,
  AGENT_INBOX_VANITY_SLUG_PARTIAL_FILTER,
  DalService,
  IntegrationRepository,
} from '@novu/dal';

/**
 * Unique claim for vanity Agent Inbox addresses (`{handle}@domain`).
 * Existing keyed rows are outside the partial filter, so the index builds empty.
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
    await collection.createIndex(
      { 'credentials.emailSlugPrefix': 1, 'credentials.inboxDomain': 1 },
      {
        unique: true,
        name: AGENT_INBOX_VANITY_SLUG_INDEX,
        partialFilterExpression: AGENT_INBOX_VANITY_SLUG_PARTIAL_FILTER,
      }
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
