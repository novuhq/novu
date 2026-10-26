import 'server-only';

import type { HumanAccount } from './human-account';
import { requestForAccount } from './human-api-key';

type OperatorName = { firstName?: string | null; lastName?: string | null };

/**
 * The operator's own contact: the "you" row in Contacts, and who a channel is tried out on while it's
 * being set up. The API keeps track of it, so it's the same contact `setup` uses. `null` before
 * anything was set up.
 */
export async function findOperatorContactId(account: HumanAccount): Promise<string | null> {
  const operator = await requestForAccount<{ subscriberId?: string }>(account, '/v1/human/operator');

  return operator?.subscriberId ?? null;
}

/**
 * Makes sure the relay agent and the operator's contact exist, and returns the contact's id. It's what
 * `setup` runs first, and running it again changes nothing. A name that's passed replaces the
 * contact's; leaving it out keeps it.
 */
export async function ensureOperatorContact(account: HumanAccount, name: OperatorName = {}): Promise<string> {
  return (await ensureRelay(account, name)).contactId;
}

/** What the onboarding knows when it makes the agent: its name, and where its operator gets mail. */
type RelayDetails = {
  /** What the agent is called from now on. Left out, a new agent is called "Human" and an old one keeps its name. */
  agentName?: string;
  /** The operator's own address, so mail they send to the agent is recognized as theirs. */
  operatorEmail?: string;
  /** The mailbox local-part they chose. Left out, the API derives one from the name. */
  inboxHandle?: string;
};

/**
 * The same setup, for a caller that also needs the relay agent's own id, as creating a Slack app does,
 * or that names the agent, as the first step of the onboarding does.
 */
export async function ensureRelay(
  account: HumanAccount,
  name: OperatorName = {},
  { agentName, operatorEmail, inboxHandle }: RelayDetails = {}
): Promise<{ agentId: string; contactId: string }> {
  const setup = await requestForAccount<{ agentId: string; subscriberId: string }>(account, '/v1/human/setup', {
    method: 'POST',
    body: {
      operator: true,
      ...(name.firstName ? { firstName: name.firstName } : {}),
      ...(name.lastName ? { lastName: name.lastName } : {}),
      ...(agentName ? { agentName } : {}),
      ...(operatorEmail ? { email: operatorEmail } : {}),
      ...(inboxHandle ? { inboxHandle } : {}),
    },
  });

  return { agentId: setup.agentId, contactId: setup.subscriberId };
}
