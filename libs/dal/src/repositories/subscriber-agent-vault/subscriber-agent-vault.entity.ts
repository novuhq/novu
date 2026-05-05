import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export type SubscriberAgentVaultConnectionStatus = 'connected' | 'expired' | 'failed';

export interface SubscriberAgentVaultConnection {
  /** MCP catalog id (matches AgentMcpServer.name and Anthropic mcp_server_name). */
  mcpServerName: string;
  /** Anthropic credential id (vcrd_…) inside this subscriber's vault. */
  credentialId: string;
  status: SubscriberAgentVaultConnectionStatus;
  connectedAt: string;
  lastUsedAt?: string;
}

/**
 * Maps a Novu subscriber to the Anthropic vault that holds their personal MCP
 * credentials for a given agent. One row per (subscriber, agent) pair within a
 * Novu environment. The Anthropic vault id is created lazily on first session.
 *
 * `subscriberId` is the external (string) subscriber identifier used everywhere
 * in the agent system (matches `ChannelEndpoint.subscriberId`), not a Mongo
 * `ObjectId`, because the agent flow can produce synthetic identifiers like
 * `<envId>:<agentIdentifier>:<conversationId>` for unlinked platform users.
 */
export class SubscriberAgentVaultEntity {
  _id: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  subscriberId: string;

  _agentId: string;

  /** Anthropic vault id (vlt_…). */
  anthropicVaultId: string;

  connections: SubscriberAgentVaultConnection[];

  createdAt: string;

  updatedAt: string;
}

export type SubscriberAgentVaultDBModel = ChangePropsValueType<
  SubscriberAgentVaultEntity,
  '_environmentId' | '_organizationId' | '_agentId'
>;
