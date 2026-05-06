import { ChangePropsValueType } from '../../types/helpers';
import { EnvironmentId } from '../environment';
import { OrganizationId } from '../organization';

export enum ConversationStatusEnum {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
}

export enum ConversationParticipantTypeEnum {
  SUBSCRIBER = 'subscriber',
  AGENT = 'agent',
  PLATFORM_USER = 'platform_user',
}

export interface ConversationParticipant {
  type: ConversationParticipantTypeEnum;
  /** The referenced entity ID — subscriberId when type === SUBSCRIBER */
  id: string;
}

export interface ConversationChannel {
  /** Platform slug: slack | whatsapp | teams | gchat | github */
  platform: string;
  /** The Novu integration used on this channel */
  _integrationId: string;
  /** Unique thread identifier on the platform (e.g. Slack channel+ts, GitHub PR number) */
  platformThreadId: string;
  /** Chat SDK SerializedThread — stored for reply delivery via ThreadImpl.fromJSON() */
  serializedThread?: Record<string, unknown>;
  /** Platform message ID of the thread-starting message */
  firstPlatformMessageId?: string;
}

export class ConversationEntity {
  _id: string;

  /** User-facing ID for API responses, URLs, and webhook payloads */
  identifier: string;

  /** References AgentEntity._id — populated once agent CRUD is implemented */
  _agentId: string;

  /** All parties in the conversation; extensible to agents/bots in future */
  participants: ConversationParticipant[];

  /** Platform bindings — one entry per platform/thread the conversation spans */
  channels: ConversationChannel[];

  status: ConversationStatusEnum;

  /** Human-readable label derived from the first user message or set explicitly by the agent */
  title: string;

  /** Customer-controlled key/value bag accumulated across turns, sent back in every bridge payload */
  metadata: Record<string, unknown>;

  messageCount: number;

  /** Truncated preview of the most recent message (max 200 chars) */
  lastMessagePreview?: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  lastActivityAt: string;
}

export type ConversationDBModel = ChangePropsValueType<
  ConversationEntity,
  '_agentId' | '_environmentId' | '_organizationId'
>;
