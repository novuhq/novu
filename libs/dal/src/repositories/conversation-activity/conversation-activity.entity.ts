import { ChangePropsValueType } from '../../types/helpers';
import { EnvironmentId } from '../environment';
import { OrganizationId } from '../organization';

export enum ConversationActivityTypeEnum {
  MESSAGE = 'message',
  /** In-place edit of a previously sent agent message, via replyHandle.edit() */
  EDIT = 'edit',
  /**
   * Immutable delete tombstone for a previously sent agent message.
   * Append-only ledger for all channels (dashboard timeline + web history).
   * Does not hard-delete the original MESSAGE activity.
   */
  DELETE = 'delete',
  /** System-generated timeline event (e.g. workflow triggered, conversation resolved) */
  SIGNAL = 'signal',
  /** Agent proposed a tool call that requires human approval before it runs. Carries `{ approvalId, toolCallId, toolName, input }` in `toolData`. */
  TOOL_APPROVAL_REQUEST = 'tool_approval_request',
  /** Human approve/deny verdict for a pending tool approval. Carries `{ approvalId, approved }` in `toolData`. */
  TOOL_APPROVAL_DECISION = 'tool_approval_decision',
  /** Outcome of an executed (or denied) tool call. Carries `{ toolCallId, toolName, output }` in `toolData`. */
  TOOL_RESULT = 'tool_result',
  /** An MCP OAuth connection is required before the agent can continue. */
  MCP_CONNECTION_REQUEST = 'mcp_connection_request',
  /** Outcome of a previously requested MCP OAuth connection. */
  MCP_CONNECTION_RESULT = 'mcp_connection_result',
  /** Agent run began. Client fold sets `isRunning`; excluded from model/bridge history. */
  RUN_START = 'run_start',
  /** Agent run ended (`richContent.lifecycle` holds outcome). Excluded from model/bridge history. */
  RUN_FINISH = 'run_finish',
  /** Agent run failed (`richContent.lifecycle` holds message/code). Excluded from model/bridge history. */
  RUN_ERROR = 'run_error',
}

/** Storage types for protocol run lifecycle rows — visibility is governed by activity views. */
export type RunLifecycleActivityType =
  | ConversationActivityTypeEnum.RUN_START
  | ConversationActivityTypeEnum.RUN_FINISH
  | ConversationActivityTypeEnum.RUN_ERROR;

export enum ConversationActivitySenderTypeEnum {
  SUBSCRIBER = 'subscriber',
  PLATFORM_USER = 'platform_user',
  AGENT = 'agent',
  SYSTEM = 'system',
}

export interface ConversationActivitySignalData {
  /** The signal type that was executed (trigger, resolve, escalate) */
  type: string;
  /** Relevant IDs or metadata about the signal execution */
  payload?: Record<string, unknown>;
}

export interface ConversationActivityToolData {
  /** The tool call this activity relates to (request + result). */
  toolCallId?: string;
  /** Human-readable tool name (request + result). */
  toolName?: string;
  /** Correlation id linking an approval request to its decision (request + decision). */
  approvalId?: string;
  /** Tool input arguments (request). */
  input?: Record<string, unknown>;
  /** Approve/deny verdict (decision). */
  approved?: boolean;
  /** Executed tool output, or the `execution-denied` marker (result). */
  output?: unknown;
  /** Server-minted action id for approve (request). Echoed by headless / card UIs. */
  approveActionId?: string;
  /** Server-minted action id for deny (request). Echoed by headless / card UIs. */
  denyActionId?: string;
  /** Server-minted always-allow-this-tool action id (request). Echoed by Agent Chat / card UIs. */
  trustToolActionId?: string;
  /** Server-minted always-allow-MCP-server action id (request, MCP tools only). */
  trustServerActionId?: string;
  /** MCP server name when the gated tool is from an MCP server (request). */
  mcpServerName?: string;
}

export class ConversationActivityEntity {
  _id: string;

  /** User-facing ID for API responses and webhook payloads */
  identifier: string;

  _conversationId: string;

  type: ConversationActivityTypeEnum;

  content: string;

  /** Platform slug this activity occurred on */
  platform: string;

  /** The Novu integration that handled this activity */
  _integrationId: string;

  /** Thread ID on the platform — ties the activity to a specific ConversationChannel */
  platformThreadId: string;

  senderType: ConversationActivitySenderTypeEnum;

  /** The ID of the sender — subscriberId, agentId, or "system" */
  senderId: string;

  /** Denormalized display name; avoids a join for simple rendering */
  senderName?: string;

  /** Platform-native message ID (e.g. Slack ts) — used for deduplication */
  platformMessageId?: string;

  /**
   * Conversation event sequence when allocated at live emit / durable persist.
   * Ephemeral typing sequences create intentional gaps in durable history.
   */
  sequence?: number;

  /** Structured content for markdown, card, or file messages — absent for plain text */
  richContent?: Record<string, unknown>;

  /** Populated only when type === SIGNAL */
  signalData?: ConversationActivitySignalData;

  /** Populated only for the `TOOL_*` activity types — the tool call, decision, or result. */
  toolData?: ConversationActivityToolData;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;
}

export type ConversationActivityDBModel = ChangePropsValueType<
  ConversationActivityEntity,
  '_conversationId' | '_environmentId' | '_organizationId' | '_integrationId'
>;
