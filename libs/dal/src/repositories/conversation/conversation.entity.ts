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

/**
 * Active-conversations billing state. An "active conversation" is counted once
 * per activation episode: the first time an agent engages on a (re)opened
 * thread, again after a rolling inactivity window lapses, and again whenever a
 * new billing period begins. These fields let `ConversationActivationService`
 * decide idempotently whether an engagement starts a new activation without
 * scanning the activity log.
 */
export interface ConversationBillingState {
  /** Period key (YYYY-MM, UTC) the conversation was last counted in. */
  lastCountedPeriodKey?: string;
  /** ISO timestamp of the most recent counted agent engagement — anchors the rolling window. */
  lastEngagementAt?: string;
  /** ISO timestamp the current activation episode began. */
  activationStartedAt?: string;
  /**
   * ISO timestamp set when the conversation is resolved. While present, the next
   * agent engagement is counted as a reopen activation. Cleared when counted.
   */
  resolvedAt?: string;
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
   * Slack message ID of the currently active plan card.
   * Set on first tool, cleared on finalize.
   * Only one card is always active per conversation.
   */
  activePlanMessageId?: string;

  /**
   * Set while managed-agent setup blocks dispatch for this thread. Cleared after
   * the parked inbound is replayed or the setup card is resolved without replay.
   */
  pendingManagedAgentSetup?: PendingManagedAgentSetup;

  tokenUsage?: ConversationTokenUsage;

  /** Active-conversations billing/metering state — see `ConversationBillingState`. */
  billing?: ConversationBillingState;

  /**
   * Whether the primary channel thread is a direct message (vs a group/channel),
   * captured from the platform at creation. Drives the rolling-window selection
   * for active-conversation counting on paths without a live thread (outbound).
   */
  isDirectMessage?: boolean;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  lastActivityAt: string;
}

export type ConversationDBModel = ChangePropsValueType<
  ConversationEntity,
  '_agentId' | '_environmentId' | '_organizationId'
>;
