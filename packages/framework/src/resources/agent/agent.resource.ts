import type { Agent, AgentHandlers, AgentMetadata } from './agent.types';

/**
 * Define a new conversational agent.
 *
 * @param agentId - Unique identifier matching the agent entity created in Novu (e.g. 'wine-bot')
 * @param handlers - Handler functions for agent events
 * @param metadata - Optional display metadata surfaced during bridge discovery
 */
export function agent(agentId: string, handlers: AgentHandlers, metadata?: AgentMetadata): Agent {
  if (!agentId) {
    throw new Error('agent() requires a non-empty agentId');
  }

  if (!handlers?.onMessage) {
    throw new Error(`agent('${agentId}') requires an onMessage handler`);
  }

  return {
    id: agentId,
    handlers,
    name: metadata?.name,
    description: metadata?.description,
  };
}
