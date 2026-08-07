import type { AgentMessage } from '@novu/agent-event-protocol';

export type { AgentMessage };

export type SendMessageArgs = {
  agentId: string;
  text: string;
  /**
   * Resume this conversation.
   * Omit to use the agent draft: a new chat on first send, or sticky resume of
   * the draft started by a prior uncontrolled send for this agent.
   * Loading another conversation via `loadConversation` does not change the draft.
   */
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
};

export type AgentChatMessagesUpdated = {
  agentId: string;
  conversationId?: string;
  messages: AgentMessage[];
};
