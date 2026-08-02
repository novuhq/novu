import { WorkflowAgentDispatchDestination, WorkflowAgentDispatchStatusEnum } from '@novu/shared';
import { ChangePropsValueType } from '../../types/helpers';
import { EnvironmentId } from '../environment';
import { OrganizationId } from '../organization';

export class WorkflowAgentDispatchEntity {
  _id: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _agentId: string;

  _integrationId: string;

  /** Unique per environment — `${messageId}:${endpointIdentifier}`. */
  idempotencyKey: string;

  status: WorkflowAgentDispatchStatusEnum;

  platform: string;

  platformThreadId?: string;

  platformMessageId?: string;

  _notificationId: string;

  _jobId: string;

  _messageId: string;

  transactionId: string;

  workflowIdentifier: string;

  stepId?: string;

  subscriberId: string;

  destination: WorkflowAgentDispatchDestination;

  workspaceId?: string;

  content?: string;

  createdAt: string;

  updatedAt: string;
}

export type WorkflowAgentDispatchDBModel = ChangePropsValueType<
  WorkflowAgentDispatchEntity,
  '_agentId' | '_integrationId' | '_environmentId' | '_organizationId' | '_notificationId' | '_jobId' | '_messageId'
>;
