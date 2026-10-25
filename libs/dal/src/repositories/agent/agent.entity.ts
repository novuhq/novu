import type {
  AgentAnalyticsSource,
  AgentReplyPolicyEnum,
  AgentRuntime,
  AgentSubscriberAccessEnum,
  AgentVisibility,
  ManagedRuntimeConfigDto,
} from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export interface AgentBehavior {
  acknowledgeOnReceived?: boolean;
  reactionOnResolved?: string | null;
  /**
   * Whether the agent accepts inbound messages from senders not yet linked to a
   * subscriber, across all channels. `open` auto-provisions unknown senders;
   * `restricted` rejects them. Managed create defaults to open; self-hosted
   * create defaults to restricted. Always persisted (backfilled for legacy rows).
   */
  subscriberAccess: AgentSubscriberAccessEnum;
  /**
   * Shared-room reply policy. Absent on legacy rows is treated as `auto_reply`.
   */
  replyPolicy?: AgentReplyPolicyEnum;
}

export interface ManagedRuntimeConfig {
  /** The agent-runtime provider ID (e.g. 'anthropic') */
  providerId: ManagedRuntimeConfigDto['providerId'];
  /** Reference to the Integration that holds the encrypted API key */
  _integrationId: string;
  /** The agent entity ID returned by the provider at provisioning time */
  externalAgentId: string;
  /** Novu-owned provider config last synced for this agent. Matches `AGENT_MANAGED_DEFINITION_VERSION`; unset until the first sync. */
  managedDefinitionVersion?: number;
}

/** The agent's own picture, uploaded by its operator and kept in file storage. */
export interface AgentPicture {
  storageKey: string;
  contentType: string;
  /** Changes with the file, so a new picture gets a new address and an old one can be cached for good. */
  version: string;
}

/** How a host reaches an Agent Inbox agent: the `agentinbox` CLI, or the hosted MCP server. */
export type AgentHostVia = 'cli' | 'mcp';

export const AGENT_HOST_VIAS: readonly AgentHostVia[] = ['cli', 'mcp'];

/**
 * The hosts Agent Inbox tells apart, by the id the CLI, the MCP server and the dashboard share. `general` is
 * any other host, and any host that didn't say which one it is.
 */
export const AGENT_HOST_IDS = [
  'claude-code',
  'codex',
  'opencode',
  'cursor',
  'hermes',
  'openclaw',
  'general',
  'claude',
  'chatgpt',
  'grok',
] as const;

export type AgentHostId = (typeof AGENT_HOST_IDS)[number];

/** When a host, or the hosts that came in one way, connected and last checked. Every time is an ISO timestamp. */
export interface AgentHostEntry {
  /** The first time it came in: it used a one-time code, or checked the inbox. */
  connectedAt?: string;
  /** The last time it checked the inbox. */
  lastCheckedAt?: string;
}

/** One host, on every computer it runs on, whichever way it came in. */
export interface AgentNamedHostEntry extends AgentHostEntry {
  /** The way it came in last: when it connected, or when it last checked the inbox. */
  via?: AgentHostVia;
}

/** The newest unread conversation a host found the first time any host checked the inbox. */
export interface AgentHostWaitingMessage {
  conversationId: string;
  /** Who wrote in it, as the inbox lists them. */
  from: string;
  subject: string;
  /** When its newest message arrived. */
  at: string;
  /** When a host first saw it: in that first check. */
  seenAt: string;
}

/** Who can write to an Agent Inbox agent: anyone, or only its contacts. */
export const AGENT_INBOX_REACHES = ['anyone', 'contacts'] as const;

export type AgentInboxReach = (typeof AGENT_INBOX_REACHES)[number];

/** Which hosts act as an Agent Inbox agent, and when they last checked its inbox. */
export interface AgentHosts {
  /** Each host by its id. Two computers with the same host, or one host that came in both ways, share an entry. */
  byId?: Partial<Record<AgentHostId, AgentNamedHostEntry>>;
  /**
   * The hosts that came in through the CLI, and through MCP, from before hosts were told apart: one entry for
   * each way in, whichever host it was. Only read now, for agents whose hosts haven't come in again since.
   */
  cli?: AgentHostEntry;
  mcp?: AgentHostEntry;
  /** The first time any host checked the inbox. */
  firstCheckedAt?: string;
  /** Missing when nothing unread was waiting at the first check. */
  waitingMessage?: AgentHostWaitingMessage;
}

export class AgentEntity {
  _id: string;

  name: string;

  identifier: string;

  description?: string;

  /** Set for Human relay agents only (`human agent update --picture`). */
  picture?: AgentPicture;

  /** Set for Human relay agents only, once a host has connected or checked the inbox. */
  hosts?: AgentHosts;

  /** Set for Human relay agents only, once the operator chose on the dashboard. Missing reads as `anyone`. */
  reach?: AgentInboxReach;

  /**
   * Set for Human relay agents only, while the operator has paused them on the dashboard (ISO timestamp).
   * Messages keep arriving, but hosts can't read the inbox or send until the operator resumes the agent.
   */
  pausedAt?: string;

  active: boolean;

  behavior: AgentBehavior;

  bridgeUrl?: string;

  devBridgeUrl?: string;

  devBridgeActive?: boolean;

  /**
   * Whether this agent's brain is self-hosted (bridge) or managed by a provider.
   * Absence of this field is treated as 'self-hosted' for backward compatibility.
   */
  runtime?: AgentRuntime;

  /**
   * Discovery scope of the agent — `public` agents are listed to the
   * organization at large, `private` agents are reserved for the future
   * privacy/sharing feature. Today every agent is created `public`; absence
   * of the field is treated as `public`.
   */
  visibility?: AgentVisibility;

  /**
   * Present only when runtime === 'managed'. Holds the stable provider identifiers
   * (providerId, integration reference, external agent id). All live config
   * (model, systemPrompt, MCP servers, tools) is fetched from the provider on demand.
   */
  managedRuntime?: ManagedRuntimeConfig;

  /**
   * Where the agent was created from (CLI, dashboard, API). Used for product
   * behaviour such as the no-bridge onboarding reply; also powers analytics.
   */
  creationSource?: AgentAnalyticsSource;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdBy?: string;

  createdAt: string;

  updatedAt: string;
}

export type AgentDBModel = ChangePropsValueType<AgentEntity, '_environmentId' | '_organizationId' | 'createdBy'>;
