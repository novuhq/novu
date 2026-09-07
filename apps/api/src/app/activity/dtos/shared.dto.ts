import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryLifecycleStatusEnum, SeverityLevelEnum } from '@novu/shared';
import { IsArray, IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

export enum WorkflowRunStatusDtoEnum {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export class TopicResponseDto {
  @ApiProperty({ description: 'Internal topic identifier' })
  @IsString()
  _topicId: string;

  @ApiProperty({ description: 'Topic key' })
  @IsString()
  topicKey: string;
}
export class GetWorkflowRunResponseBaseDto {
  @ApiProperty({ description: 'Workflow run id' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Workflow identifier' })
  @IsString()
  workflowId: string;

  @ApiProperty({ description: 'Workflow name' })
  @IsString()
  workflowName: string;

  @ApiProperty({ description: 'Organization identifier' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Environment identifier' })
  @IsString()
  environmentId: string;

  @ApiProperty({ description: 'Internal subscriber identifier' })
  @IsString()
  internalSubscriberId: string;

  @ApiPropertyOptional({ description: 'External subscriber identifier' })
  @IsOptional()
  @IsString()
  subscriberId?: string;

  @ApiProperty({
    description: 'Workflow run status',
    enum: WorkflowRunStatusDtoEnum,
  })
  @IsIn(Object.values(WorkflowRunStatusDtoEnum))
  status: WorkflowRunStatusDtoEnum;

  @ApiProperty({
    description: 'Workflow run delivery lifecycle status',
    enum: DeliveryLifecycleStatusEnum,
  })
  @IsIn(Object.values(DeliveryLifecycleStatusEnum))
  deliveryLifecycleStatus: DeliveryLifecycleStatusEnum;

  @ApiProperty({ description: 'Trigger identifier' })
  @IsString()
  triggerIdentifier: string;

  @ApiProperty({ description: 'Transaction identifier' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsString()
  createdAt: string;

  @ApiProperty({ description: 'Update timestamp' })
  @IsString()
  updatedAt: string;

  @ApiProperty({ description: 'Severity', enum: SeverityLevelEnum })
  @IsEnum(SeverityLevelEnum)
  severity: SeverityLevelEnum;

  @ApiProperty({ description: 'Critical flag' })
  @IsBoolean()
  critical: boolean;

  @ApiPropertyOptional({
    description: 'Context (single or multi) in which the workflow run was executed',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];

  @ApiPropertyOptional({
    description: 'Topics',
    type: [TopicResponseDto],
  })
  @IsOptional()
  @IsArray()
  topics?: TopicResponseDto[];
}

export enum ReportTypeEnum {
  DELIVERY_TREND = 'delivery-trend',
  INTERACTION_TREND = 'interaction-trend',
  WORKFLOW_BY_VOLUME = 'workflow-by-volume',
  PROVIDER_BY_VOLUME = 'provider-by-volume',
  MESSAGES_DELIVERED = 'messages-delivered',
  ACTIVE_SUBSCRIBERS = 'active-subscribers',
  AVG_MESSAGES_PER_SUBSCRIBER = 'avg-messages-per-subscriber',
  WORKFLOW_RUNS_METRIC = 'workflow-runs-metric',
  TOTAL_INTERACTIONS = 'total-interactions',
  WORKFLOW_RUNS_TREND = 'workflow-runs-trend',
  ACTIVE_SUBSCRIBERS_TREND = 'active-subscribers-trend',
  WORKFLOW_RUNS_COUNT = 'workflow-runs-count',
}
