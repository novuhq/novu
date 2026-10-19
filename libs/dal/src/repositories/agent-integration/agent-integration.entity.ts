import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class AgentIntegrationEntity {
  _id: string;

  _agentId: string;

  _integrationId: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  connectedAt?: string | null;

  /**
   * Tombstone marker. Set when the user deliberately disconnects the integration
   * from an agent. Tombstoned links are excluded from reads by default via schema
   * pre-hooks; query with an explicit `disconnectedAt` condition to see them.
   */
  disconnectedAt?: string | null;

  createdAt: string;

  updatedAt: string;
}

export type AgentIntegrationDBModel = ChangePropsValueType<
  AgentIntegrationEntity,
  '_agentId' | '_integrationId' | '_environmentId' | '_organizationId'
>;
