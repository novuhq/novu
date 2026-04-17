import { ChangePropsValueType } from '../../types/helpers';
import { EnvironmentId } from '../environment';
import { OrganizationId } from '../organization';

export enum ConversationActivityTypeEnum {
  MESSAGE = 'message',
  /** In-place edit of a previously sent agent message, via replyHandle.edit() */
  EDIT = 'edit',
  /** System-generated timeline event (e.g. workflow triggered, conversation resolved) */
  SIGNAL = 'signal',
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

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;
}

export type ConversationActivityDBModel = ChangePropsValueType<
  ConversationActivityEntity,
  '_conversationId' | '_environmentId' | '_organizationId' | '_integrationId'
>;
