import type { AgentApprovalPart, AgentConversationStatus, AgentMessage } from '@novu/agent-event-protocol';

export type { AgentApprovalPart, AgentConversationStatus, AgentMessage };

export type SendMessageArgs = {
  agentId: string;
  text: string;
  /**
   * Existing conversation to append to.
   * Omit this field to create a new conversation. The client does not reuse a prior chat.
   * After create, pass the returned `conversationId` on later sends.
   */
  conversationId?: string;
  /**
   * Immutable holder key for the local store and emit subscription.
   * Defaults to `conversationId` on resume, or a minted `local_*` key on create.
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
  hasMore: boolean;
};

export type FetchMoreArgs = {
  agentId: string;
  conversationId?: string;
  key?: string;
};

export type FetchMoreResult = {
  messages: AgentMessage[];
  hasMore: boolean;
};

export type RespondToApprovalArgs = {
  agentId: string;
  approvalId: string;
  decision: 'approved' | 'denied';
  conversationId?: string;
  key?: string;
};

export type RespondToApprovalResult = {
  conversationId: string;
};

export type AgentChatMessagesUpdated = {
  agentId: string;
  conversationId?: string;
  /** Immutable holder key. Stable for the life of the local conversation entry. */
  key: string;
  messages: AgentMessage[];
  isRunning: boolean;
  status: AgentConversationStatus;
  hasMore: boolean;
};
