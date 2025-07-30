import { IsString, IsOptional, IsDate, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowRunStatusEnum } from '@novu/application-generic';

export enum WorkflowRunStatusDtoEnum {
  SUCCESS = 'success',
  ERROR = 'error',
  PENDING = 'pending',
  SKIPPED = 'skipped',
  CANCELED = 'canceled',
  MERGED = 'merged',
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
}
