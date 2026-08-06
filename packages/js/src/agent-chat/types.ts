import type { AgentMessage } from '@novu/agent-event-protocol';

export type { AgentMessage };

export type SendMessageArgs = {
  agentId: string;
  text: string;
  /** Resume an existing conversation. Omit to start a new one. */
  conversationId?: string;
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
  hasMore: boolean;
};

export type AgentChatMessagesUpdated = {
  agentId: string;
  conversationId?: string;
  messages: AgentMessage[];
};
