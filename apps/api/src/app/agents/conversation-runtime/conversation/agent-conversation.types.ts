import type { ConversationActivityEntity, ConversationActivitySenderTypeEnum, ConversationChannel } from '@novu/dal';
import type { TriggerRecipientsPayload } from '@novu/shared';

export interface PersistInboundMessageParams {
  conversationId: string;
  platform: string;
  integrationId: string;
  platformThreadId: string;
  senderType: ConversationActivitySenderTypeEnum;
  senderId: string;
  senderName?: string;
  content: string;
  richContent?: Record<string, unknown>;
  hasPlatformAttachments?: boolean;
  platformMessageId?: string;
  /** Caller-supplied activity identifier; defaults to a server-minted act_* id */
  identifier?: string;
  /** Pre-allocated conversation event sequence; minted at persist time when absent */
  sequence?: number;
  environmentId: string;
  organizationId: string;
}

export interface ConversationActivityContext {
  conversationId: string;
  channel: ConversationChannel;
  agentIdentifier: string;
  environmentId: string;
  organizationId: string;
}

export interface PersistAgentMessageResult {
  activity: ConversationActivityEntity;
  /** `false` when the identifier already existed — the caller lost the persist race. */
  created: boolean;
}

export interface PersistAgentActivityParams extends ConversationActivityContext {
  platformMessageId?: string;
  /** Overrides channel.platformThreadId when delivery returns a different thread ID */
  platformThreadId?: string;
  /** Caller-supplied activity identifier; defaults to a server-minted act_* id */
  identifier?: string;
  agentName?: string;
  content: string;
  richContent?: Record<string, unknown>;
  /** Pre-allocated conversation event sequence; minted at persist time when absent */
  sequence?: number;
}

export interface PersistToolApprovalRequestParams extends ConversationActivityContext {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input?: Record<string, unknown>;
  /** Human-readable preview for the display timeline. */
  preview?: string;
  /** When omitted, self-hosted `tool-approval:*` ids are minted. */
  approveActionId?: string;
  denyActionId?: string;
  mcpServerName?: string;
}

export type MetadataOp =
  | { action: 'set'; key: string; value: unknown }
  | { action: 'delete'; key: string }
  | { action: 'clear' };

export interface UpdateMetadataParams extends ConversationActivityContext {
  currentMetadata: Record<string, unknown>;
  ops: MetadataOp[];
}

export interface ResolveConversationParams extends ConversationActivityContext {
  summary?: string;
}

export interface PersistTriggerSignalParams extends ConversationActivityContext {
  workflowId: string;
  to: TriggerRecipientsPayload;
  transactionId: string;
}

export interface PersistWorkflowOriginHydrationParams extends ConversationActivityContext {
  platformMessageId: string;
  platformThreadId: string;
  messageContent: string;
  signalData: Record<string, unknown>;
}

export interface PersistToolApprovalDecisionParams extends ConversationActivityContext {
  approvalId: string;
  approved: boolean;
  toolName?: string;
  /** Client `idem_*` when the click came from Agent Chat. Reused as the activity identifier. */
  identifier?: string;
  actorType:
    | ConversationActivitySenderTypeEnum.SUBSCRIBER
    | ConversationActivitySenderTypeEnum.PLATFORM_USER
    | ConversationActivitySenderTypeEnum.SYSTEM;
  actorId: string;
}

export interface PersistToolResultParams extends ConversationActivityContext {
  toolCallId: string;
  toolName?: string;
  /** The tool's output as returned by the model runtime (JSON-serializable). */
  output: unknown;
  /** Human-readable preview for the display timeline; defaults to a generic line. */
  preview?: string;
}

export interface PersistMcpConnectionRequestParams extends ConversationActivityContext {
  actionId: string;
  mcpId: string;
  displayName: string;
  authorizeUrl: string;
  authorizeUrlWithAutoApprove?: string;
}

export interface PersistMcpConnectionResultParams extends ConversationActivityContext {
  actionId: string;
  mcpId: string;
  status: 'connected' | 'failed';
  message?: string;
}
