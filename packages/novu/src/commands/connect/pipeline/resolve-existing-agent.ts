import type { AgentRecord } from '../api/agents';
import type { AgentConnectMode, AgentSummary, ChannelChoice, ConnectCommandOptions } from '../types';

export function shouldSkipAgentConnectModePicker(options: ConnectCommandOptions): boolean {
  return Boolean(options.agentIdentifier?.trim());
}

export function resolveConnectModeForExistingAgent(
  agent: Pick<AgentRecord, 'runtime'>,
  channel?: ChannelChoice
): AgentConnectMode {
  if (channel === 'agent-chat' && agent.runtime !== 'self-hosted') {
    return 'demo';
  }

  if (agent.runtime === 'self-hosted') {
    return 'custom-code';
  }

  return 'demo';
}

export function resolveExistingAgentByIdentifier(existingAgents: AgentRecord[], agentIdentifier: string): AgentSummary {
  const normalized = agentIdentifier.trim();
  const match = existingAgents.find((agent) => agent.identifier === normalized);

  if (!match) {
    throw new Error(`No agent found with identifier "${normalized}" in this environment.`);
  }

  return {
    id: match._id,
    identifier: match.identifier,
    name: match.name,
  };
}
