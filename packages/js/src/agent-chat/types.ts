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
};

export type AgentChatMessagesUpdated = {
  agentId: string;
  conversationId?: string;
  messages: AgentMessage[];
};
