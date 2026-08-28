import type { AgentMessage, AgentPendingAction } from './agent-message.types';

/** Pending tool-approval and MCP-connect actions in `messages`. */
export function derivePendingActions(messages: AgentMessage[]): AgentPendingAction[] {
  const pending: AgentPendingAction[] = [];

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'approval' && part.state === 'pending') {
        const { state: _state, ...action } = part;
        pending.push({
          ...action,
          type: 'tool-approval',
          id: part.approvalId,
        });
      }
      if (part.type === 'mcp-connection' && part.state === 'pending') {
        const { state: _state, message: _message, ...action } = part;
        pending.push({
          ...action,
          id: part.actionId,
        });
      }
    }
  }

  return pending;
}
