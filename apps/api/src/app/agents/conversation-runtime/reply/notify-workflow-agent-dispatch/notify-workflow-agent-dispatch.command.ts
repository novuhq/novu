import { ENDPOINT_TYPES } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class WorkflowAgentDispatchDestinationCommand {
  @IsIn([ENDPOINT_TYPES.SLACK_USER, ENDPOINT_TYPES.SLACK_CHANNEL])
  type: typeof ENDPOINT_TYPES.SLACK_USER | typeof ENDPOINT_TYPES.SLACK_CHANNEL;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  channelId?: string;
}

export class WorkflowAgentDispatchOriginCommand {
  @IsString()
  @IsNotEmpty()
  notificationId: string;

  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsString()
  @IsNotEmpty()
  workflowIdentifier: string;

  @IsOptional()
  @IsString()
  stepId?: string;

  @IsString()
  @IsNotEmpty()
  subscriberId: string;
}

export class NotifyWorkflowAgentDispatchCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @ValidateNested()
  @Type(() => WorkflowAgentDispatchDestinationCommand)
  destination: WorkflowAgentDispatchDestinationCommand;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ValidateNested()
  @Type(() => WorkflowAgentDispatchOriginCommand)
  origin: WorkflowAgentDispatchOriginCommand;

  @IsOptional()
  @IsString()
  workspaceId?: string;
}
