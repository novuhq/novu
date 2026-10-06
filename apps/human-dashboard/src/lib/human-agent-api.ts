import 'server-only';

import type { HumanAccount } from './human-account';
import { isHumanApiNotFound } from './human-api-error';
import { requestForAccount } from './human-api-key';

/** The relay agent `human setup` creates; the claim keeps its identifier. */
export const RELAY_AGENT_IDENTIFIER = 'human-relay';

export type RelayAgent = {
  identifier: string;
  name: string;
  active: boolean;
  description?: string;
};

/** The agent that carries messages between the operator's agents and their contacts, or `null` before any setup. */
export async function getRelayAgent(account: HumanAccount): Promise<RelayAgent | null> {
  try {
    const agent = await requestForAccount<RelayAgent>(account, `/v1/agents/${RELAY_AGENT_IDENTIFIER}`);

    return {
      identifier: agent.identifier,
      name: agent.name,
      active: agent.active !== false,
      description: agent.description,
    };
  } catch (error) {
    if (isHumanApiNotFound(error)) {
      return null;
    }

    throw error;
  }
}

/**
 * Makes sure the relay agent and the operator's own contact exist. It's what `human setup` runs first,
 * and running it again changes nothing. A name that's passed replaces the contact's; leaving it out keeps it.
 */
export async function ensureRelayAgent(
  account: HumanAccount,
  operator: { contactId: string; firstName?: string | null; lastName?: string | null }
): Promise<void> {
  await requestForAccount(account, '/v1/human/setup', {
    method: 'POST',
    body: {
      subscriberId: operator.contactId,
      agentIdentifier: RELAY_AGENT_IDENTIFIER,
      ...(operator.firstName ? { firstName: operator.firstName } : {}),
      ...(operator.lastName ? { lastName: operator.lastName } : {}),
    },
  });
}
