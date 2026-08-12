import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import type {
  AgentConversationStatus,
  AgentConversationTyping,
  AgentMcpConnectionAction,
  AgentMcpConnectionPart,
  AgentMessage,
  AgentPendingAction,
  AgentToolApprovalAction,
} from './agent-message.types';

export type {
  AgentConversationStatus,
  AgentConversationTyping,
  AgentEventEnvelope,
  AgentMcpConnectionAction,
  AgentMcpConnectionPart,
  AgentMessage,
  AgentPendingAction,
  AgentToolApprovalAction,
};

/**
 * HMAC-SHA256(env secret, agentId) hex. Required when the env's `novu-web-chat`
 * integration has Security HMAC enabled.
 */
export type AgentHashFields = {
  agentHash?: string;
};

export type SendMessageArgs = AgentHashFields & {
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

export type RespondToActionArgs = AgentHashFields & {
  agentId: string;
  actionId: string;
  decision: 'approved' | 'denied';
  conversationId?: string;
  key?: string;
};

export type RespondToActionResult = {
  conversationId: string;
};

/** What caused a fold. A live fold carries the envelope that caused it. Internal to the store seam. */
export type AgentChatChangeSource =
  | { kind: 'live'; envelope: AgentEventEnvelope }
  | { kind: 'history' }
  | { kind: 'local' };

/**
 * What one fold added to a holder, next to the folded snapshot.
 * A `history` fold replays stored events, so it is catch-up and not new activity.
 */
export type AgentChatChange = AgentChatChangeSource & {
  /** Messages this fold added. A fold that only changes existing messages adds none. */
  addedMessages: AgentMessage[];
  /** Actions that became pending in this fold. One action is reported one time. */
  newActions: AgentPendingAction[];
};

export type AgentChatMessagesUpdated = {
  agentId: string;
  conversationId?: string;
  /** Immutable holder key. Stable for the life of the local conversation entry. */
  key: string;
  messages: AgentMessage[];
  isRunning: boolean;
  typing?: AgentConversationTyping;
  status: AgentConversationStatus;
  hasMore: boolean;
  change: AgentChatChange;
};
