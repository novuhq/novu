import 'server-only';

import { cache } from 'react';

import type { HumanAccount } from './human-account';
import { isHumanApiNotFound } from './human-api-error';
import { requestForAccount } from './human-api-key';

/** The relay agent `human setup` creates; the claim keeps its identifier. */
export const RELAY_AGENT_IDENTIFIER = 'human-relay';

/** The name `human setup` and the dashboard give a relay agent until the operator picks one (NV-8914). */
export const DEFAULT_AGENT_NAME = 'Human';

export type RelayAgent = {
  /** The agent's own id, which is different in every account. */
  id: string;
  /** `human-relay` in every account. */
  identifier: string;
  name: string;
  active: boolean;
  description?: string;
  /** ISO timestamp of the `human setup` that made it. */
  createdAt?: string;
};

type ApiAgent = Omit<RelayAgent, 'id'> & { _id: string };

/**
 * The agent that carries messages between the operator's agents and their contacts, or `null` until
 * `human setup` has made it. An account starts without one.
 *
 * The shell and the page of one request share a single lookup.
 */
export const getRelayAgent = cache(async (account: HumanAccount): Promise<RelayAgent | null> => {
  try {
    const agent = await requestForAccount<ApiAgent>(account, `/v1/agents/${RELAY_AGENT_IDENTIFIER}`);

    return {
      id: agent._id,
      identifier: agent.identifier,
      name: agent.name,
      active: agent.active !== false,
      description: agent.description,
      createdAt: agent.createdAt,
    };
  } catch (error) {
    if (isHumanApiNotFound(error)) {
      return null;
    }

    throw error;
  }
});

/**
 * What a server action answers when it needs the agent and there is none. The pages already keep the
 * operator from getting that far; this is for a request that arrives anyway.
 */
export const AGENT_NOT_SET_UP_MESSAGE = 'Set up your agent first. The Agent page shows you how.';

/** How the dashboard calls an agent that has no name of its own yet (NV-8914). */
export const UNNAMED_AGENT_LABEL = 'Human assistant';

/**
 * What the dashboard calls the agent: the name the operator gave it, or "Human assistant" while it
 * still has the default one.
 */
export function agentDisplayName(agent: RelayAgent): string {
  return agent.name && agent.name !== DEFAULT_AGENT_NAME ? agent.name : UNNAMED_AGENT_LABEL;
}
