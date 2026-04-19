import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export interface AgentBehavior {
  acknowledgeOnReceived?: boolean;
  reactionOnResolved?: string | null;
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

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type AgentDBModel = ChangePropsValueType<AgentEntity, '_environmentId' | '_organizationId'>;
