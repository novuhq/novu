import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class AgentIntegrationEntity {
  _id: string;

  _agentId: string;

  _integrationId: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type AgentIntegrationDBModel = ChangePropsValueType<
  AgentIntegrationEntity,
  '_agentId' | '_integrationId' | '_environmentId' | '_organizationId'
>;
