import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import type { NovuError } from '../utils/errors';
import type {
  AgentConversationStatus,
  AgentConversationTyping,
  AgentMessage,
  AgentPendingAction,
} from '../web-chat/agent-message.types';

export type WebChatPaginationStatus = 'idle' | 'loading' | 'error';

/** Older-history page state. */
export type WebChatPagination = {
  status: WebChatPaginationStatus;
  hasMore: boolean;
};

/** Why the snapshot changed. A live update includes the envelope that caused it. */
export type WebChatChangeSource =
  | { kind: 'live'; envelope: AgentEventEnvelope }
  | { kind: 'history' }
  | { kind: 'local' };

/**
 * What one update added, next to the snapshot.
 * A `history` update replays stored events, so it is not new activity.
 */
export type WebChatChange = WebChatChangeSource & {
  /** Messages this update added. An update that only changes existing messages adds none. */
  addedMessages: AgentMessage[];
  /** Actions that became pending in this update. Each action is reported one time. */
  newActions: AgentPendingAction[];
};

export type WebChatMessagesUpdated = {
  agentId: string;
  conversationId?: string;
  /** Stable session key for this local conversation. */
  key: string;
  messages: AgentMessage[];
  isRunning: boolean;
  typing?: AgentConversationTyping;
  status: AgentConversationStatus;
  hasMore: boolean;
  pagination: WebChatPagination;
  error?: NovuError;
  /** True while reconnect recovery is in progress. */
  isRecovering: boolean;
  /** Set when reconnect recovery fails. */
  catchUpError?: NovuError;
  change: WebChatChange;
};
