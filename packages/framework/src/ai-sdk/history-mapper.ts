import type { ModelMessage } from 'ai';
import type { AgentHistoryEntry } from '../resources/agent/agent.types';

function isAssistantRole(role: string): boolean {
  return role === 'agent' || role === 'assistant';
}

function distinctHumanSenders(history: AgentHistoryEntry[]): number {
  const names = new Set<string>();
  for (const entry of history) {
    if (!isAssistantRole(entry.role) && entry.role !== 'system' && entry.senderName) {
      names.add(entry.senderName);
    }
  }

  return names.size;
}

/**
 * Map Novu conversation history into AI SDK `ModelMessage[]`.
 * v1 is text-only: tool-call/tool-result replay from richContent is intentionally
 * not reconstructed. System/metadata entries (carrying `signalData`) are skipped.
 *
 * The current inbound message is already appended to `history` by Novu before the
 * bridge fires — do not append the handler's `message` arg again.
 *
 * TODO: hook up full tool calls and system messages
 */
export function toModelMessages(history: AgentHistoryEntry[], system?: string): ModelMessage[] {
  const messages: ModelMessage[] = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }

  const multiSender = distinctHumanSenders(history) > 1;

  for (const entry of history) {
    if (entry.signalData || entry.role === 'system' || entry.type === 'signal' || !entry.content.trim()) {
      continue;
    }

    const isAssistant = isAssistantRole(entry.role);
    const text =
      !isAssistant && multiSender && entry.senderName ? `${entry.senderName}: ${entry.content}` : entry.content;

    messages.push({ role: isAssistant ? 'assistant' : 'user', content: text });
  }

  return messages;
}
