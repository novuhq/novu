import '../../src/config';

import { AgentRepository } from '@novu/dal';
import { AgentSubscriberAccessEnum } from '@novu/shared';

type UpdateManyFn = (
  filter: Record<string, unknown>,
  update: Record<string, unknown>
) => Promise<{ matchedCount: number; modifiedCount: number }>;

/** Same predicate as AgentConfigResolver / RuntimeResolver: managed requires both fields. */
const MANAGED_AGENT_FILTER = {
  runtime: 'managed',
  managedRuntime: { $exists: true, $ne: null },
} as const;

/**
 * Backfill unset subscriberAccess:
 * - managed (runtime + managedRuntime) → open (Slack/Teams auto-provision continuity)
 * - everything else unset → restricted (require explicit opt-in before Pass-null bridge ingress)
 *
 * Uses the same managed predicate as runtime resolution so `runtime: 'managed'`
 * without `managedRuntime` is not opened, and legacy rows with only one of the
 * two fields stay restricted.
 */
export async function setSubscriberAccessDefaultsOnUnsetAgents(updateMany: UpdateManyFn): Promise<{
  managedOpen: { matchedCount: number; modifiedCount: number };
  selfHostedRestricted: { matchedCount: number; modifiedCount: number };
}> {
  const managedOpen = await updateMany(
    { 'behavior.subscriberAccess': { $exists: false }, ...MANAGED_AGENT_FILTER },
    { $set: { 'behavior.subscriberAccess': AgentSubscriberAccessEnum.OPEN } }
  );

  const selfHostedRestricted = await updateMany(
    {
      'behavior.subscriberAccess': { $exists: false },
      $nor: [MANAGED_AGENT_FILTER],
    },
    { $set: { 'behavior.subscriberAccess': AgentSubscriberAccessEnum.RESTRICTED } }
  );

  return { managedOpen, selfHostedRestricted };
}

export async function run() {
  console.log('Start migration - set behavior.subscriberAccess defaults where unset');

  const agentRepository = new AgentRepository();
  const result = await setSubscriberAccessDefaultsOnUnsetAgents((filter, update) =>
    agentRepository._model.collection.updateMany(filter, update).then((r) => ({
      matchedCount: r.matchedCount,
      modifiedCount: r.modifiedCount,
    }))
  );

  console.log(`Managed→open: matched ${result.managedOpen.matchedCount} modified ${result.managedOpen.modifiedCount}`);
  console.log(
    `Self-hosted→restricted: matched ${result.selfHostedRestricted.matchedCount} modified ${result.selfHostedRestricted.modifiedCount}`
  );
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
