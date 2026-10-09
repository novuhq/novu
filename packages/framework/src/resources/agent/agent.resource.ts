import { requireRuntimeContext } from './agent.runtime';
import type { Agent, AgentHandlers } from './agent.types';

/**
 * Define a new conversational agent.
 *
 * @param agentId - Unique identifier matching the agent entity created in Novu (e.g. 'wine-bot')
 * @param handlers - Handler functions for agent events
 */
export function agent(agentId: string, handlers: AgentHandlers): Agent {
  if (!agentId) {
    throw new Error('agent() requires a non-empty agentId');
  }

  if (!handlers?.onMessage) {
    throw new Error(`agent('${agentId}') requires an onMessage handler`);
  }

  const { onToolApproval } = handlers;
  if (!onToolApproval) {
    return { id: agentId, handlers, userOnToolApproval: false };
  }

  // The handler runs the approved tool itself; without a recorded result Novu treats the approval as orphaned.
  const recordingHandlers: AgentHandlers = {
    ...handlers,
    onToolApproval: async (decision, ctx) => {
      const result = await onToolApproval(decision, ctx);
      if (decision.approved) {
        requireRuntimeContext(ctx).emitToolResult({
          toolCallId: decision.toolCall.id,
          toolName: decision.toolCall.name,
          output: typeof result === 'string' ? result : null,
          preview: `Tool "${decision.toolCall.name}" ran`,
        });
      }

      return result;
    },
  };

  return { id: agentId, handlers: recordingHandlers, userOnToolApproval: true };
}
