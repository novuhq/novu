import {
  type AgentConversationState,
  type AgentEventEnvelope,
  appendUserMessage,
  applyEnvelopes,
  createInitialAgentConversationState,
} from '@novu/agent-event-protocol';

/**
 * Stable local identity for one conversation holder.
 * The object reference never changes; timeline fields are overwritten in place.
 * This is an in-memory UI cache, not a synchronized copy of the server timeline.
 */
export type ConversationEntry = AgentConversationState & {
  agentId: string;
  /** Public `conv_*` id once created on the server, or when resuming. */
  conversationId?: string;
  /**
   * Immutable subscription / map key for this holder's whole life.
   * Create sessions use `local_*`; resume sessions use the `conv_*` id.
   */
  key: string;
  /** Serializes overlapping creates on this holder until a `conv_*` exists. */
  pendingCreate?: Promise<void>;
};

/** Client-minted holder key for a create session (before `conv_*` exists). */
export function createLocalConversationKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `local_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  return `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

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
 * One map keyed by an immutable holder `key` (NV-8445: state keyed by conversation
 * identity — `local_*` until create returns `conv_*`, then the same key stays).
 * Omit `conversationId` on send always creates; callers pass the returned id next.
 */
export class AgentChatStore {
  #byKey = new Map<string, ConversationEntry>();
  /** Fired after every mutation so AgentChat can emit to React. */
  #onUpdate: (entry: ConversationEntry) => void;

  constructor(onUpdate: (entry: ConversationEntry) => void) {
    this.#onUpdate = onUpdate;
  }

  /** Drop all conversations (wired into `Novu.clearCache` / changeSubscriber). */
  clear(): void {
    this.#byKey.clear();
  }

  get(key: string): ConversationEntry | undefined {
    return this.#byKey.get(key);
  }

  /** Find a holder that already has this public conversation id (same-session append). */
  getByConversationId(agentId: string, conversationId: string): ConversationEntry | undefined {
    for (const entry of this.#byKey.values()) {
      if (entry.agentId === agentId && entry.conversationId === conversationId) {
        return entry;
      }
    }

    return undefined;
  }

  /**
   * Return the entry for `key` if it exists; otherwise create an empty holder.
   * Does not reuse another holder that merely shares `conversationId` — resume
   * (`key === conversationId`) stays separate from an in-flight `local_*` create.
   */
  getOrCreate(args: { agentId: string; key: string; conversationId?: string }): ConversationEntry {
    const existing = this.#byKey.get(args.key);
    if (existing) {
      return existing;
    }

    const entry: ConversationEntry = {
      ...createInitialAgentConversationState(),
      agentId: args.agentId,
      conversationId: args.conversationId,
      key: args.key,
    };
    this.#byKey.set(args.key, entry);

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
   * Mark an optimistic message `sent`, swap in the server message id, and record
   * the public conversation id on this holder. Does not change `entry.key`.
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
      // Local-only (e.g. failed / in-flight) stay after the server page; cheap ordering approx.
      messages: [...folded.messages, ...localOnly],
    });

    this.#onUpdate(entry);

    return entry;
  }

  /**
   * Run an HTTP post for this entry.
   * Unclaimed creates: one in flight at a time on this holder; waiters re-check
   * `entry.conversationId` so a successful create is reused and a failed create
   * still serializes the next attempt (no fan-out double mint).
   * After claim (or explicit id): posts run immediately with no gating.
   */
  withCreateClaim<T>(
    entry: ConversationEntry,
    explicitConversationId: string | undefined,
    post: (conversationId?: string) => Promise<T>
  ): Promise<T> {
    const known = explicitConversationId ?? entry.conversationId;
    if (known) {
      return post(known);
    }

    const run = async (): Promise<T> => {
      if (entry.conversationId) {
        return post(entry.conversationId);
      }

      return post(undefined);
    };

    const previous = entry.pendingCreate ?? Promise.resolve();
    const current = previous.then(run, run);
    entry.pendingCreate = current.then(
      () => undefined,
      () => undefined
    );

    return current;
  }
}
