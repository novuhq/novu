import type { AgentMessage, AgentPendingAction } from './agent-message.types';

/** Stable dedup and lookup key for a pending action derived from message parts. */
export function pendingActionKey(action: AgentPendingAction): string {
  return action.type === 'approval' ? action.approvalId : action.actionId;
}

/** Pending approval and MCP-connect parts in `messages`. */
export function derivePendingActions(messages: AgentMessage[]): AgentPendingAction[] {
  const pending: AgentPendingAction[] = [];

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'approval' && part.state === 'pending') {
        pending.push({ ...part, state: 'pending' });
      }
      if (part.type === 'mcp-connection' && part.state === 'pending') {
        pending.push({ ...part, state: 'pending' });
      }
    }
  }

  return pending;
}
