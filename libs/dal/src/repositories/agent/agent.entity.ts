import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export interface AgentReactionSettings {
  /** Emoji name for acknowledging incoming messages (null = disabled, undefined = default "eyes") */
  onMessageReceived?: string | null;
  /** Emoji name for resolved conversations (null = disabled, undefined = default "check") */
  onResolved?: string | null;
}

export interface AgentBehavior {
  thinkingIndicatorEnabled?: boolean;
  reactions?: AgentReactionSettings;
}

export class AgentEntity {
  _id: string;

  name: string;

  identifier: string;

  description?: string;

  active: boolean;

  behavior?: AgentBehavior;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type AgentDBModel = ChangePropsValueType<AgentEntity, '_environmentId' | '_organizationId'>;
