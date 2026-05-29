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
  /** Platform message ID of the thread-starting message */
  firstPlatformMessageId?: string;
}

export interface ConversationTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
}

export interface PendingManagedAgentSetup {
  /** Platform message id for the user turn not yet dispatched to the managed agent */
  pendingPlatformMessageId: string;
  /** Platform message id of the in-thread setup card (for edit-in-place) */
  setupMessageId?: string;
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

  /** Provider-side session ID (e.g. Anthropic conversation_id) managed by thalamus */
  externalSessionId?: string;

  /**
   * Anthropic vault id (`vlt_…`) that was attached to `externalSessionId` when the
   * managed session was created. Thalamus only applies `vault_ids` at session
   * creation, so the dispatch flow rebinds the session when the resolved vault
   * changes between turns. Tracked here (not in `metadata`) so the value can't
   * be overwritten by customer metadata signals from the bridge.
   */
  managedSessionVaultId?: string;

  /**
   * Set while managed-agent setup blocks dispatch for this thread. Cleared after
   * the parked inbound is replayed or the setup card is resolved without replay.
   */
  pendingManagedAgentSetup?: PendingManagedAgentSetup;

  tokenUsage?: ConversationTokenUsage;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  lastActivityAt: string;
}

export type ConversationDBModel = ChangePropsValueType<
  ConversationEntity,
  '_agentId' | '_environmentId' | '_organizationId'
>;
