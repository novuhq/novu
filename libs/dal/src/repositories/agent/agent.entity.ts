import type { AgentRuntime, AgentVisibility, ManagedRuntimeConfigDto } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export interface AgentBehavior {
  acknowledgeOnReceived?: boolean;
  reactionOnResolved?: string | null;
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

export class AgentEntity {
  _id: string;

  name: string;

  identifier: string;

  description?: string;

  active: boolean;

  behavior?: AgentBehavior;

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

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdBy?: string;

  createdAt: string;

  updatedAt: string;
}

export type AgentDBModel = ChangePropsValueType<AgentEntity, '_environmentId' | '_organizationId' | 'createdBy'>;
