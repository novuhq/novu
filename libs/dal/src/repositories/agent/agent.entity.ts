import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class AgentEntity {
  _id: string;

  name: string;

  identifier: string;

  description?: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type AgentDBModel = ChangePropsValueType<AgentEntity, '_environmentId' | '_organizationId'>;
