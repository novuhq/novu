import type { AgentMessage } from '@novu/agent-event-protocol';

export type { AgentMessage };

export type SendMessageArgs = {
  agentId: string;
  text: string;
  /**
   * Existing conversation to append to.
   * Omit to create a new conversation (no implicit reuse of a prior chat).
   * After create, pass the returned `conversationId` on later sends.
   */
  conversationId?: string;
  /**
   * Immutable holder key for the local store / emit subscription.
   * Defaults to `conversationId` when resuming, or a minted `local_*` key on create.
   */
  key?: string;
};

export type SendMessageResult = {
  conversationId: string;
  messageId: string;
};

export type LoadConversationArgs = {
  agentId: string;
  conversationId: string;
};

export type LoadConversationResult = {
  conversationId: string;
  messages: AgentMessage[];
};

export type AgentChatMessagesUpdated = {
  agentId: string;
  conversationId?: string;
  /** Immutable holder key — stable for the life of the local conversation entry. */
  key: string;
  messages: AgentMessage[];
};
