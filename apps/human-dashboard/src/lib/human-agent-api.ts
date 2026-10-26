import 'server-only';

import { cache } from 'react';

import { AGENT_REACHES, type AgentSettings, type AgentSettingsChange, DEFAULT_AGENT_SETTINGS } from './agent-settings';
import type { HumanAccount } from './human-account';
import { isHumanApiNotFound } from './human-api-error';
import { requestForAccount } from './human-api-key';

/** The relay agent `setup` creates; the claim keeps its identifier. */
export const RELAY_AGENT_IDENTIFIER = 'human-relay';

/** The name `setup` and the dashboard give a relay agent until the operator picks one (NV-8914). */
export const DEFAULT_AGENT_NAME = 'Human';

export type RelayAgent = {
  /** The agent's own id, which is different in every account. */
  id: string;
  /** `human-relay` in every account. */
  identifier: string;
  name: string;
  active: boolean;
  description?: string;
  /** Where the picture the operator gave it can be loaded. Missing when it has none. */
  pictureUrl?: string;
  /** ISO timestamp of the `setup` that made it. */
  createdAt?: string;
  /** Who can reach it and whether it is paused. `null` when they couldn't be read just now. */
  settings: AgentSettings | null;
  /**
   * Who runs it, as its public card names them: "Ada L.". Empty without the operator's first name, or when it
   * couldn't be read just now.
   */
  operatorName: string;
  /** The operator's whole first name, for "Ada’s agent". Empty when `operatorName` is. */
  operatorFirstName: string;
};

type ApiAgent = Omit<RelayAgent, 'id' | 'pictureUrl' | 'settings' | 'operatorName' | 'operatorFirstName'> & {
  _id: string;
};

/** `GET`, `PATCH /v1/human/agent`: the agent as the Agent Inbox endpoints describe it. */
type HumanApiAgent = {
  pictureUrl?: string;
  reach?: string;
  paused?: boolean;
  pausedAt?: string;
  /** Only `GET` names the operator, as the public card does. */
  operatorName?: string;
  operatorFirstName?: string;
};

const HUMAN_AGENT_PATH = '/v1/human/agent';

/**
 * The agent that carries messages between the operator's agents and their contacts, or `null` until
 * `setup` has made it. An account starts without one.
 *
 * The shell and the page of one request share a single lookup.
 */
export const getRelayAgent = cache(async (account: HumanAccount): Promise<RelayAgent | null> => {
  try {
    const [agent, details] = await Promise.all([
      requestForAccount<ApiAgent>(account, `/v1/agents/${RELAY_AGENT_IDENTIFIER}`),
      loadHumanDetails(account),
    ]);

    return {
      id: agent._id,
      identifier: agent.identifier,
      name: agent.name,
      active: agent.active !== false,
      description: agent.description,
      pictureUrl: details?.pictureUrl,
      createdAt: agent.createdAt,
      settings: details ? toSettings(details) : null,
      operatorName: details?.operatorName ?? '',
      operatorFirstName: details?.operatorFirstName ?? '',
    };
  } catch (error) {
    if (isHumanApiNotFound(error)) {
      return null;
    }

    throw error;
  }
});

/**
 * The picture and the settings. Neither may take a page down: without them the agent is shown with the
 * mascot, and its settings as unknown rather than as defaults that may not be what is saved.
 */
async function loadHumanDetails(account: HumanAccount): Promise<HumanApiAgent | null> {
  try {
    return await requestForAccount<HumanApiAgent>(account, HUMAN_AGENT_PATH);
  } catch (error) {
    console.error('Failed to read the agent’s picture and settings', error);

    return null;
  }
}

/** Changes who can reach the agent, or pauses or resumes it, and returns the settings it has now. */
export async function updateAgentSettings(account: HumanAccount, change: AgentSettingsChange): Promise<AgentSettings> {
  const agent = await requestForAccount<HumanApiAgent>(account, HUMAN_AGENT_PATH, { method: 'PATCH', body: change });

  return toSettings(agent);
}

/**
 * Deletes the agent for good: its address, channels, threads and the connections of its hosts. The account
 * and the contacts stay. An agent that is gone already counts as deleted.
 */
export async function deleteAgent(account: HumanAccount): Promise<void> {
  try {
    await requestForAccount(account, HUMAN_AGENT_PATH, { method: 'DELETE' });
  } catch (error) {
    if (!isHumanApiNotFound(error)) {
      throw error;
    }
  }
}

/** Sends the onboarding test from the Agent Email Inbox to the operator’s sign-up address. */
export function sendAgentTestEmail(account: HumanAccount, email: string): Promise<{ success: boolean }> {
  return requestForAccount(account, '/v1/human/agent/test-email', { method: 'POST', body: { email } });
}

function toSettings(agent: HumanApiAgent): AgentSettings {
  return {
    reach: AGENT_REACHES.find((value) => value === agent.reach) ?? DEFAULT_AGENT_SETTINGS.reach,
    paused: agent.paused && agent.pausedAt ? { at: agent.pausedAt } : null,
  };
}

/**
 * What a server action answers when it needs the agent and there is none. The pages already keep the
 * operator from getting that far; this is for a request that arrives anyway.
 */
export const AGENT_NOT_SET_UP_MESSAGE = 'Set up your agent first. The Configure page shows you how.';

/** How the dashboard calls an agent that has no name of its own yet (NV-8914). */
export const UNNAMED_AGENT_LABEL = 'Inbox agent';

/**
 * What the dashboard calls the agent: the name the operator gave it, or "Inbox agent" while it
 * still has the default one.
 */
export function agentDisplayName(agent: RelayAgent): string {
  return agent.name && agent.name !== DEFAULT_AGENT_NAME ? agent.name : UNNAMED_AGENT_LABEL;
}
