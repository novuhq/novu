import type { AgentMessage } from '@novu/agent-event-protocol';

export type { AgentMessage };

export type SendMessageArgs = {
  agentId: string;
  text: string;
  /**
   * Resume this conversation.
   * Omit to use the agent draft: first send claims a `conv_*`, later sends sticky-resume it.
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
  /**
   * Immutable subscription key for this holder.
   * Draft emits stay `agent:<agentId>` after claim; resume emits are `conv:<id>`.
   */
  key: string;
  messages: AgentMessage[];
};
