import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export interface AgentBehavior {
  thinkingIndicatorEnabled?: boolean;
}

export class AgentEntity {
  _id: string;

  name: string;

  identifier: string;

  description?: string;

  behavior?: AgentBehavior;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type AgentDBModel = ChangePropsValueType<AgentEntity, '_environmentId' | '_organizationId'>;
