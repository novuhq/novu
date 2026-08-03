import { ChangePropsValueType } from '../../types/helpers';
import { EnvironmentId } from '../environment';
import { OrganizationId } from '../organization';

/**
 * Post-send seed linking a Slack (or future) platform thread to the Novu workflow
 * message that opened it. Used by inbound hydration before a Conversation exists.
 */
export class WorkflowAgentDispatchEntity {
  _id: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _agentId: string;

  _integrationId: string;

  platform: string;

  platformThreadId: string;

  platformMessageId: string;

  _notificationId: string;

  _jobId: string;

  _messageId: string;

  transactionId: string;

  workflowIdentifier: string;

  stepId?: string;

  subscriberId: string;

  createdAt: string;

  updatedAt: string;
}

export type WorkflowAgentDispatchDBModel = ChangePropsValueType<
  WorkflowAgentDispatchEntity,
  '_agentId' | '_integrationId' | '_environmentId' | '_organizationId' | '_notificationId' | '_jobId' | '_messageId'
>;
