import { createBridgeAgent, listAgents } from '../../api/agents';
import type { ConnectApiClient } from '../../api/client';
import type { AgentSummary, ConnectCommandOptions } from '../../types';
import type { ConnectUI } from '../../ui/ui';
import { defaultAgentNameFromDir, deriveAgentIdentifier } from '../chat-sdk/derive-identifier';

export async function createBridgeAgentFlow(
  client: ConnectApiClient,
  ui: ConnectUI,
  options: ConnectCommandOptions
): Promise<{ agent: AgentSummary; flow: 'created' | 'reused' }> {
  const existingAgents = await listAgents(client);
  const bridgeAgents = existingAgents.filter((agent) => agent.runtime !== 'managed');

  if (bridgeAgents.length > 0) {
    const pick = await ui.pickExistingOrCreate(bridgeAgents.map(toSummary));

    if (pick.action === 'use') {
      return { agent: pick.agent, flow: 'reused' };
    }
  }

  const defaultName = defaultAgentNameFromDir(
    options.scaffoldDir?.trim() || options.projectDir?.trim() || pathBasename(process.cwd())
  );
  const name = await ui.promptForAgentName(defaultName);
  const identifier = deriveAgentIdentifier(name);

  ui.creatingAgent(name);
  const created = await createBridgeAgent(client, { name, identifier });

  return { agent: toSummary(created), flow: 'created' };
}

function pathBasename(dir: string): string {
  const parts = dir.replace(/[/\\]+$/, '').split(/[/\\]/);

  return parts[parts.length - 1] || 'my-bridge-agent';
}

function toSummary(agent: { _id: string; identifier: string; name: string } | AgentSummary): AgentSummary {
  const id = '_id' in agent ? agent._id : agent.id;

  return { id, identifier: agent.identifier, name: agent.name };
}
