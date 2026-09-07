import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import { SubscriberId } from '../subscriber';

export type ToolTrustPolicy = 'always_ask' | 'always_allow';

export const DEFAULT_TOOL_TRUST_POLICY: ToolTrustPolicy = 'always_ask';

export type ToolTrust = {
  /** Applies to every tool from this source unless a per-tool override exists. */
  serverDefault?: ToolTrustPolicy;
  /** Per-tool overrides keyed by tool name (e.g. "list_issues"). */
  tools?: Record<string, ToolTrustPolicy>;
};

export interface AgentToolTrustState {
  /** Per-MCP-server trust, keyed by `mcpServerName`. */
  mcp?: Record<string, ToolTrust>;
  /** Catch-all trust bucket for non-MCP (directly-invoked) tools. */
  direct?: ToolTrust;
}

export class AgentToolTrustEntity {
  _id: string;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  _agentId: string;

  _subscriberId: SubscriberId;

  trust: AgentToolTrustState;

  createdAt: string;

  updatedAt: string;
}

export type AgentToolTrustDBModel = ChangePropsValueType<
  AgentToolTrustEntity,
  '_agentId' | '_environmentId' | '_organizationId' | '_subscriberId'
>;
