import { ChangePropsValueType } from '../../types/helpers';
import { EnvironmentId } from '../environment';
import { OrganizationId } from '../organization';

export enum ConversationActivityTypeEnum {
  MESSAGE = 'message',
  /** In-place edit of a previously sent agent message, via replyHandle.edit() */
  EDIT = 'edit',
  /** System-generated timeline event (e.g. workflow triggered, conversation resolved) */
  SIGNAL = 'signal',
  /** Agent proposed a tool call that requires human approval before it runs. Carries `{ approvalId, toolCallId, toolName, input }` in `toolData`. */
  TOOL_APPROVAL_REQUEST = 'tool_approval_request',
  /** Human approve/deny verdict for a pending tool approval. Carries `{ approvalId, approved }` in `toolData`. */
  TOOL_APPROVAL_DECISION = 'tool_approval_decision',
  /** Outcome of an executed (or denied) tool call. Carries `{ toolCallId, toolName, output }` in `toolData`. */
  TOOL_RESULT = 'tool_result',
}

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
