import 'server-only';

import type { HumanAccount } from './human-account';
import { requestForAccount } from './human-api-key';

/**
 * The operator's own contact: the "you" row in Contacts, and who a channel is tried out on while it's
 * being set up. The API keeps track of it, so it's the same contact `human setup` uses. `null` before
 * anything was set up.
 */
export async function findOperatorContactId(account: HumanAccount): Promise<string | null> {
  const operator = await requestForAccount<{ subscriberId?: string }>(account, '/v1/human/operator');

  return operator?.subscriberId ?? null;
}

/**
 * Makes sure the relay agent and the operator's contact exist, and returns the contact's id. It's what
 * `human setup` runs first, and running it again changes nothing. A name that's passed replaces the
 * contact's; leaving it out keeps it.
 */
export async function ensureOperatorContact(
  account: HumanAccount,
  name: { firstName?: string | null; lastName?: string | null } = {}
): Promise<string> {
  const setup = await requestForAccount<{ subscriberId: string }>(account, '/v1/human/setup', {
    method: 'POST',
    body: {
      operator: true,
      ...(name.firstName ? { firstName: name.firstName } : {}),
      ...(name.lastName ? { lastName: name.lastName } : {}),
    },
  });

  return setup.subscriberId;
}
