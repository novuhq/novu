import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ENDPOINT_TYPES, WorkflowAgentDispatchStatusEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class WorkflowAgentDispatchDestinationBodyDto {
  @ApiProperty({ enum: [ENDPOINT_TYPES.SLACK_USER, ENDPOINT_TYPES.SLACK_CHANNEL] })
  @IsIn([ENDPOINT_TYPES.SLACK_USER, ENDPOINT_TYPES.SLACK_CHANNEL])
  type: typeof ENDPOINT_TYPES.SLACK_USER | typeof ENDPOINT_TYPES.SLACK_CHANNEL;

  @ApiPropertyOptional({ description: 'Required when type is slack_user' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userId?: string;

  @ApiPropertyOptional({ description: 'Required when type is slack_channel' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  channelId?: string;
}

export class WorkflowAgentDispatchOriginBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  notificationId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workflowIdentifier: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stepId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subscriberId: string;
}

export class NotifyWorkflowAgentDispatchBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @ApiProperty({ type: WorkflowAgentDispatchDestinationBodyDto })
  @ValidateNested()
  @Type(() => WorkflowAgentDispatchDestinationBodyDto)
  destination: WorkflowAgentDispatchDestinationBodyDto;

  @ApiProperty({ description: 'Compiled chat body to deliver' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Idempotency key — typically messageId:endpointIdentifier' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiProperty({ type: WorkflowAgentDispatchOriginBodyDto })
  @ValidateNested()
  @Type(() => WorkflowAgentDispatchOriginBodyDto)
  origin: WorkflowAgentDispatchOriginBodyDto;

  @ApiPropertyOptional({ description: 'Slack workspace/team id for multi-workspace bots' })
  @IsOptional()
  @IsString()
  workspaceId?: string;
}

export class NotifyWorkflowAgentDispatchResponseBodyDto {
  @ApiProperty()
  dispatchId: string;

  @ApiProperty()
  platformMessageId: string;

  @ApiProperty()
  platformThreadId: string;

  @ApiProperty({ enum: WorkflowAgentDispatchStatusEnum })
  status: WorkflowAgentDispatchStatusEnum;
}
