import {
  type AgentConversationState,
  type AgentMessage,
  appendUserMessage,
  createInitialAgentConversationState,
} from '@novu/agent-event-protocol';

/**
 * One conversation's local state: messages plus the ids used to find it.
 * This is in-memory UI cache, not a sync copy of the server timeline.
 */
export type ConversationEntry = AgentConversationState & {
  agentId: string;
  /** Public `conv_*` id once the server returns it (or when resuming). */
  conversationId?: string;
};

function createOptimisticMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `opt_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  return `opt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function setMessageStatus(
  state: AgentConversationState,
  messageId: string,
  status: AgentMessage['status']
): AgentConversationState {
  return {
    ...state,
    messages: state.messages.map((message) => (message.id === messageId ? { ...message, status } : message)),
  };
}

/**
 * In-memory store for agent-chat conversations.
 *
 * Owns the message list the UI paints. `AgentChat` mutates this store around
 * HTTP calls; the hook listens via `onUpdate` → `agent_chat.messages.updated`.
 *
 * Dual index — same entry, two lookup keys:
 * - `#byAgentId` — first send / uncontrolled chat (`useAgentChat({ agentId })`)
 * - `#byConversationId` — after the server returns `conv_*`, or when resuming
 *
 * We never delete and recreate an entry to "move" keys. After adopt, the same
 * object is reachable by agentId and by conversationId.
 */
export class AgentChatStore {
  /** Uncontrolled chats and adopted chats keyed by agent. */
  #byAgentId = new Map<string, ConversationEntry>();
  /** Same entry objects, keyed by public conversation id once known. */
  #byConversationId = new Map<string, ConversationEntry>();
  /** Fired after every mutation so AgentChat can emit to React. */
  #onUpdate: (entry: ConversationEntry) => void;

  constructor(onUpdate: (entry: ConversationEntry) => void) {
    this.#onUpdate = onUpdate;
  }

  /** Drop all conversations (wired into `Novu.clearCache` / changeSubscriber). */
  clear(): void {
    this.#byAgentId.clear();
    this.#byConversationId.clear();
  }

  /**
   * Look up an existing conversation.
   * Prefer conversationId when present; otherwise fall back to agentId.
   */
  get(agentId: string, conversationId?: string): ConversationEntry | undefined {
    if (conversationId) {
      const byId = this.#byConversationId.get(conversationId);
      if (byId?.agentId === agentId) {
        return byId;
      }

      // First send may have adopted conversationId on the agent-keyed entry
      // before #byConversationId was populated for a concurrent reader.
      const byAgent = this.#byAgentId.get(agentId);
      if (byAgent?.conversationId === conversationId) {
        return byAgent;
      }

      return undefined;
    }

    return this.#byAgentId.get(agentId);
  }

  /** Return the entry if it exists; otherwise create an empty one. */
  getOrCreate(agentId: string, conversationId?: string): ConversationEntry {
    const existing = this.get(agentId, conversationId);
    if (existing) {
      return existing;
    }

    const entry: ConversationEntry = {
      ...createInitialAgentConversationState(),
      agentId,
      conversationId,
    };

    if (conversationId) {
      this.#byConversationId.set(conversationId, entry);
    } else {
      this.#byAgentId.set(agentId, entry);
    }

    return entry;
  }

  /**
   * Append a local user bubble with status `sending` before the HTTP call.
   * Returns the optimistic message id so the caller can mark it sent/failed.
   */
  appendSending(entry: ConversationEntry, text: string): string {
    const current = this.#latest(entry);
    const messageId = createOptimisticMessageId();
    const next: ConversationEntry = {
      ...current,
      ...appendUserMessage(current, {
        id: messageId,
        createdAt: new Date().toISOString(),
        status: 'sending',
        parts: [{ type: 'text', text, state: 'done' }],
      }),
    };

    this.#replace(current, next);
    this.#onUpdate(next);

    return messageId;
  }

  /**
   * Mark an optimistic message `sent` and attach the server conversation id.
   * When `serverMessageId` is present, swap the optimistic id so history/live join.
   * Indexes the entry under conversationId so remount/resume can find it.
   */
  markSent(
    entry: ConversationEntry,
    optimisticMessageId: string,
    conversationId: string,
    serverMessageId?: string
  ): ConversationEntry {
    const current = this.#latest(entry);
    const messages = current.messages.map((message) => {
      if (message.id !== optimisticMessageId) {
        return message;
      }

      return {
        ...message,
        id: serverMessageId ?? message.id,
        status: 'sent' as const,
      };
    });
    const next: ConversationEntry = {
      ...current,
      messages,
      conversationId,
    };

    this.#replace(current, next);
    this.#onUpdate(next);

    return next;
  }

  /** Mark an optimistic message `failed`. No auto-retry (no idempotency key). */
  markFailed(entry: ConversationEntry, messageId: string): ConversationEntry {
    const current = this.#latest(entry);
    const next: ConversationEntry = {
      ...current,
      ...setMessageStatus(current, messageId, 'failed'),
    };

    this.#replace(current, next);
    this.#onUpdate(next);

    return next;
  }

  /**
   * Replace local timeline with a folded history page (open/resume).
   * Keeps agentId; adopts conversationId into both indexes.
   */
  replaceFromHistory(
    entry: ConversationEntry,
    history: AgentConversationState,
    conversationId: string
  ): ConversationEntry {
    const current = this.#latest(entry);
    const next: ConversationEntry = {
      ...history,
      agentId: current.agentId,
      conversationId,
    };

    this.#replace(current, next);
    this.#onUpdate(next);

    return next;
  }

  /**
   * Re-read the live entry from the maps.
   * Callers may hold a stale object reference while another send mutates the store.
   */
  #latest(entry: ConversationEntry): ConversationEntry {
    if (entry.conversationId) {
      return this.#byConversationId.get(entry.conversationId) ?? this.#byAgentId.get(entry.agentId) ?? entry;
    }

    return this.#byAgentId.get(entry.agentId) ?? entry;
  }

  /**
   * Swap `prev` for `next` in both indexes.
   * Keeps agentId and conversationId pointing at the same updated entry.
   */
  #replace(prev: ConversationEntry, next: ConversationEntry): void {
    if (this.#byAgentId.get(prev.agentId) === prev) {
      this.#byAgentId.set(next.agentId, next);
    }

    if (prev.conversationId && this.#byConversationId.get(prev.conversationId) === prev) {
      this.#byConversationId.delete(prev.conversationId);
    }

    if (next.conversationId) {
      this.#byConversationId.set(next.conversationId, next);
    }
  }
}
