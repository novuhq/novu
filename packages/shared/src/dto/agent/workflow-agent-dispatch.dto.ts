import { ENDPOINT_TYPES } from '../../types/channel-endpoint';

export enum WorkflowAgentDispatchStatusEnum {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
}

export type WorkflowAgentDispatchSlackUserDestination = {
  type: typeof ENDPOINT_TYPES.SLACK_USER;
  userId: string;
};

export type WorkflowAgentDispatchSlackChannelDestination = {
  type: typeof ENDPOINT_TYPES.SLACK_CHANNEL;
  channelId: string;
};

export type WorkflowAgentDispatchDestination =
  | WorkflowAgentDispatchSlackUserDestination
  | WorkflowAgentDispatchSlackChannelDestination;

export type WorkflowAgentDispatchOriginDto = {
  notificationId: string;
  jobId: string;
  messageId: string;
  transactionId: string;
  workflowIdentifier: string;
  stepId?: string;
  subscriberId: string;
};

export type NotifyWorkflowAgentDispatchRequestDto = {
  integrationIdentifier: string;
  destination: WorkflowAgentDispatchDestination;
  content: string;
  idempotencyKey: string;
  origin: WorkflowAgentDispatchOriginDto;
  workspaceId?: string;
};

export type NotifyWorkflowAgentDispatchResponseDto = {
  dispatchId: string;
  platformMessageId: string;
  platformThreadId: string;
  status: WorkflowAgentDispatchStatusEnum;
};
