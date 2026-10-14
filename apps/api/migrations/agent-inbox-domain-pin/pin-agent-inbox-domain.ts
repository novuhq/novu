import '../../src/config';

import { getSharedAgentDomain } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { AGENT_INBOX_PROVIDER_IDS } from '@novu/shared';

type UpdateManyFn = (
  filter: Record<string, unknown>,
  update: Record<string, unknown>
) => Promise<{ matchedCount: number; modifiedCount: number }>;

/**
 * Pin existing agent inboxes to the Connect shared domain.
 *
 * New rows write `credentials.inboxDomain` at provision time. Rows from before
 * that field existed have no pin, and the reader treats a missing pin as the
 * Connect domain. Writing that same domain makes the pin explicit, so a later
 * change to the fallback cannot move addresses that were already in use.
 */
export async function pinUnsetAgentInboxDomains(
  updateMany: UpdateManyFn,
  domain: string
): Promise<{ matchedCount: number; modifiedCount: number }> {
  return updateMany(
    {
      providerId: { $in: [...AGENT_INBOX_PROVIDER_IDS] },
      'credentials.inboxDomain': { $exists: false },
    },
    { $set: { 'credentials.inboxDomain': domain } }
  );
}

export async function run() {
  const domain = getSharedAgentDomain();
  console.log(`Start migration - pin unset agent inbox domains to ${domain}`);

  const integrationRepository = new IntegrationRepository();
  const result = await pinUnsetAgentInboxDomains((filter, update) =>
    integrationRepository._model.collection.updateMany(filter, update).then((written) => ({
      matchedCount: written.matchedCount,
      modifiedCount: written.modifiedCount,
    }))
  );

  console.log(`Pinned inboxDomain: matched ${result.matchedCount} modified ${result.modifiedCount}`);
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
