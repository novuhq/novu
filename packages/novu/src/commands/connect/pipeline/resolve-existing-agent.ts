import type { AgentRecord } from '../api/agents';
import type { AgentConnectMode, AgentSummary, ConnectCommandOptions } from '../types';

export function shouldSkipAgentConnectModePicker(options: ConnectCommandOptions): boolean {
  return Boolean(options.agentIdentifier?.trim());
}

export function resolveConnectModeForExistingAgent(agent: Pick<AgentRecord, 'runtime'>): AgentConnectMode {
  return agent.runtime === 'self-hosted' ? 'custom-code' : 'demo';
}

export type ExistingAgentContext = {
  summary: AgentSummary;
  connectMode: AgentConnectMode;
};

export function resolveExistingAgentContext(
  existingAgents: AgentRecord[],
  agentIdentifier: string
): ExistingAgentContext {
  const normalized = agentIdentifier.trim();
  const record = existingAgents.find((agent) => agent.identifier === normalized);

  if (!record) {
    throw new Error(`No agent found with identifier "${normalized}" in this environment.`);
  }

  return {
    summary: {
      id: record._id,
      identifier: record.identifier,
      name: record.name,
    },
    connectMode: resolveConnectModeForExistingAgent(record),
  };
}

export function resolveExistingAgentByIdentifier(existingAgents: AgentRecord[], agentIdentifier: string): AgentSummary {
  return resolveExistingAgentContext(existingAgents, agentIdentifier).summary;
}
