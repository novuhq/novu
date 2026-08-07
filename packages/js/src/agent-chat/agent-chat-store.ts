import {
  type AgentConversationState,
  type AgentEventEnvelope,
  appendUserMessage,
  applyEnvelopes,
  createInitialAgentConversationState,
} from '@novu/agent-event-protocol';

/**
 * Stable local identity for one conversation.
 * The object reference never changes; timeline fields are overwritten in place.
 * This is an in-memory UI cache, not a synchronized copy of the server timeline.
 */
export type ConversationEntry = AgentConversationState & {
  agentId: string;
  /** Public `conv_*` id once assigned (uncontrolled send) or when resuming. */
  conversationId?: string;
};

function createOptimisticMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `opt_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  return `opt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function applyState(entry: ConversationEntry, next: AgentConversationState): void {
  entry.messages = next.messages;
  entry.isRunning = next.isRunning;
  entry.status = next.status;
  entry.lastSequence = next.lastSequence;
  entry.error = next.error;
  entry.activeAssistantMessageId = next.activeAssistantMessageId;
}

/**
 * In-memory store for agent-chat conversations.
 *
 * Owns the message list the UI paints. `AgentChat` mutates this store around
 * HTTP calls; the hook listens via `onUpdate` → `agent_chat.messages.updated`.
 *
 * Dual index — same stable holder, two lookup keys:
 * - `#byAgentId` — uncontrolled draft for that agent (omit conversationId on send)
 * - `#byConversationId` — alias added once the public `conv_*` id is known
 *
 * Holders are never swapped. `conversationId` is an alias on the existing object.
 * Resume/`loadConversation` indexes by conversationId only and does not claim the
 * agent draft key (so uncontrolled sends stay on the draft, not a resumed chat).
 */
export class AgentChatStore {
  /** Uncontrolled draft (and sticky resume) keyed by agent. */
  #byAgentId = new Map<string, ConversationEntry>();
  /** Same holders keyed by public conversation id once known. */
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
   * Prefer conversationId when present; otherwise the agent draft.
   */
  get(agentId: string, conversationId?: string): ConversationEntry | undefined {
    if (conversationId) {
      const byId = this.#byConversationId.get(conversationId);
      if (byId?.agentId === agentId) {
        return byId;
      }

      return undefined;
    }

    return this.#byAgentId.get(agentId);
  }

  /**
   * Return the entry if it exists; otherwise create an empty holder.
   * With `conversationId`: conversation index only (resume / controlled).
   * Without: agent draft slot (uncontrolled send / sticky resume).
   */
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
    const messageId = createOptimisticMessageId();
    applyState(
      entry,
      appendUserMessage(entry, {
        id: messageId,
        createdAt: new Date().toISOString(),
        status: 'sending',
        parts: [{ type: 'text', text, state: 'done' }],
      })
    );
    this.#onUpdate(entry);

    return messageId;
  }

  /**
   * Mark an optimistic message `sent`, swap in the server message id, and adopt
   * conversationId as an alias on this same holder (sticky uncontrolled resume).
   */
  markSent(
    entry: ConversationEntry,
    args: { optimisticMessageId: string; serverMessageId: string; conversationId: string }
  ): ConversationEntry {
    entry.messages = entry.messages.map((message) =>
      message.id === args.optimisticMessageId
        ? { ...message, id: args.serverMessageId, status: 'sent' as const }
        : message
    );

    if (!entry.conversationId) {
      entry.conversationId = args.conversationId;
      this.#byConversationId.set(args.conversationId, entry);
    }

    this.#onUpdate(entry);

    return entry;
  }

  /** Mark an optimistic message `failed`. No auto-retry (no idempotency key). */
  markFailed(entry: ConversationEntry, messageId: string): ConversationEntry {
    entry.messages = entry.messages.map((message) =>
      message.id === messageId ? { ...message, status: 'failed' as const } : message
    );
    this.#onUpdate(entry);

    return entry;
  }

  /**
   * Fold a history page of envelopes into this holder (open/resume).
   * Server ids win; local-only messages (in-flight or not yet on the page) stay.
   */
  absorbHistoryPage(entry: ConversationEntry, envelopes: AgentEventEnvelope[]): ConversationEntry {
    const folded = applyEnvelopes(createInitialAgentConversationState(), envelopes);
    const serverIds = new Set(folded.messages.map((message) => message.id));
    const localOnly = entry.messages.filter((message) => !serverIds.has(message.id));

    applyState(entry, {
      ...folded,
      messages: [...folded.messages, ...localOnly],
    });

    if (entry.conversationId) {
      this.#byConversationId.set(entry.conversationId, entry);
    }

    this.#onUpdate(entry);

    return entry;
  }
}
