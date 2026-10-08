import 'server-only';

import type { HumanAccount } from './human-account';
import { isHumanApiNotFound } from './human-api-error';
import { requestForAccount } from './human-api-key';

/** The relay agent `human setup` creates; the claim keeps its identifier. */
export const RELAY_AGENT_IDENTIFIER = 'human-relay';

/** The name `human setup` and the dashboard give a relay agent until the operator picks one (NV-8914). */
export const DEFAULT_AGENT_NAME = 'Human';

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
 * What the dashboard calls the agent: the name the operator gave it, or "Dima’s assistant" while it
 * still has the default one. `undefined` when there's neither, so the caller says "your agent".
 */
export function agentDisplayName(agent: RelayAgent, operatorFirstName?: string | null): string | undefined {
  const ownName = agent.name && agent.name !== DEFAULT_AGENT_NAME ? agent.name : undefined;

  return ownName ?? (operatorFirstName ? `${operatorFirstName}’s assistant` : undefined);
}
