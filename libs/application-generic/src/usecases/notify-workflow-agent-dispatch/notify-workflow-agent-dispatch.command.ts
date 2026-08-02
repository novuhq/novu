import {
  NotifyWorkflowAgentDispatchRequestDto,
  WorkflowAgentDispatchDestination,
  WorkflowAgentDispatchOriginDto,
} from '@novu/shared';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { BaseCommand } from '../../commands/base.command';

class WorkflowAgentDispatchOriginCommand extends BaseCommand implements WorkflowAgentDispatchOriginDto {
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

export class NotifyWorkflowAgentDispatchClientCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsNotEmpty()
  destination: WorkflowAgentDispatchDestination;

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

export function toNotifyWorkflowAgentDispatchRequestBody(
  command: NotifyWorkflowAgentDispatchClientCommand
): NotifyWorkflowAgentDispatchRequestDto {
  return {
    integrationIdentifier: command.integrationIdentifier,
    destination: command.destination,
    content: command.content,
    idempotencyKey: command.idempotencyKey,
    origin: command.origin,
    workspaceId: command.workspaceId,
  };
}
