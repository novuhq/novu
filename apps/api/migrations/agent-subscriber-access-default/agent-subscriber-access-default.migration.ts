import '../../src/config';

import { AgentRepository } from '@novu/dal';
import { AgentSubscriberAccessEnum } from '@novu/shared';

type UpdateManyFn = (
  filter: Record<string, unknown>,
  update: Record<string, unknown>
) => Promise<{ matchedCount: number; modifiedCount: number }>;

/**
 * One-time backfill: agents created before create-time defaults lacked
 * `behavior.subscriberAccess`. Set those unset documents to `open` so existing
 * tenants keep the previous email-provision default. Explicit `restricted`
 * (or any other value) is left alone via the `$exists: false` filter.
 */
export async function setOpenSubscriberAccessOnUnsetAgents(
  updateMany: UpdateManyFn
): Promise<{ matchedCount: number; modifiedCount: number }> {
  return updateMany(
    { 'behavior.subscriberAccess': { $exists: false } },
    { $set: { 'behavior.subscriberAccess': AgentSubscriberAccessEnum.OPEN } }
  );
}

export async function run() {
  console.log('Start migration - set behavior.subscriberAccess=open where unset');

  const agentRepository = new AgentRepository();
  const result = await setOpenSubscriberAccessOnUnsetAgents(
    (filter, update) =>
      agentRepository._model.collection.updateMany(filter, update) as Promise<{
        matchedCount: number;
        modifiedCount: number;
      }>
  );

  console.log(`Matched: ${result.matchedCount}  Modified: ${result.modifiedCount}`);
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
