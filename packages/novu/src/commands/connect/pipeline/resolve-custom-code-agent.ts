import type { AgentRecord } from '../api/agents';
import type { AgentSummary, ConnectCommandOptions } from '../types';
import type { ConnectUI } from '../ui/ui';

export function isCustomCodeConnect(options: ConnectCommandOptions): boolean {
  return options.runtime === 'custom-code' || Boolean(options.agentIdentifier?.trim());
}

export function isSelfHostedAgent(agent: AgentRecord): boolean {
  return agent.runtime !== 'managed';
}

export function filterSelfHostedAgents(agents: AgentRecord[]): AgentRecord[] {
  return agents.filter(isSelfHostedAgent);
}

function toSummary(agent: AgentRecord): AgentSummary {
  return { id: agent._id, identifier: agent.identifier, name: agent.name };
}

function assertSelfHostedAgent(agent: AgentRecord, identifier: string): void {
  if (!isSelfHostedAgent(agent)) {
    throw new Error(
      `Agent "${identifier}" is a managed agent. Use the default connect flow to create managed agents, or pass a self-hosted agent identifier.`
    );
  }
}

export async function resolveCustomCodeAgent(
  existingAgents: AgentRecord[],
  options: ConnectCommandOptions,
  ui: ConnectUI
): Promise<AgentSummary> {
  const identifier = options.agentIdentifier?.trim();

  if (identifier) {
    const match = existingAgents.find((agent) => agent.identifier === identifier);

    if (!match) {
      throw new Error(
        `Agent "${identifier}" was not found in this environment. Check the identifier and secret key, then try again.`
      );
    }

    assertSelfHostedAgent(match, identifier);

    return toSummary(match);
  }

  const selfHostedAgents = filterSelfHostedAgents(existingAgents);

  if (selfHostedAgents.length === 0) {
    throw new Error(
      'No self-hosted agents found in this environment. Deploy your agent bridge first, or omit --runtime custom-code to create a managed agent.'
    );
  }

  if (selfHostedAgents.length === 1) {
    return toSummary(selfHostedAgents[0]);
  }

  const pick = await ui.pickExistingOrCreate(selfHostedAgents.map(toSummary));

  if (pick.action === 'use') {
    return pick.agent;
  }

  throw new Error(
    'Creating a new agent is not supported with --runtime custom-code. Pass --agent-identifier or deploy a self-hosted agent first.'
  );
}
