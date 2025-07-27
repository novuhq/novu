import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsArray, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class StepRunDto {
  @ApiProperty({ description: 'Step run identifier' })
  @IsString()
  stepRunId: string;

  @ApiProperty({ description: 'Step identifier' })
  @IsString()
  stepId: string;

  @ApiProperty({ description: 'Step type' })
  @IsString()
  stepType: string;

  @ApiProperty({ description: 'Step name' })
  @IsString()
  stepName: string;

  @ApiPropertyOptional({ description: 'Provider identifier' })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiProperty({ description: 'Step status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsString()
  createdAt: Date;

  @ApiProperty({ description: 'Update timestamp' })
  @IsString()
  updatedAt: Date;

  @ApiProperty({ description: 'Execution details', type: [Object] })
  executionDetails: any[];
}

export class WorkflowRunDto {
  @ApiProperty({ description: 'Workflow run id' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Workflow run identifier' })
  @IsString()
  workflowRunId: string;

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

  @ApiProperty({ description: 'Subscriber identifier' })
  @IsString()
  subscriberId: string;

  @ApiPropertyOptional({ description: 'External subscriber identifier' })
  @IsOptional()
  @IsString()
  externalSubscriberId?: string;

  @ApiProperty({ description: 'Workflow run status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Trigger identifier' })
  @IsString()
  triggerIdentifier: string;

  @ApiProperty({ description: 'Transaction identifier' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'Channels used', type: [String] })
  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @ApiPropertyOptional({ description: 'Subscriber destination data' })
  @IsOptional()
  subscriberTo?: any;

  @ApiPropertyOptional({ description: 'Trigger payload' })
  @IsOptional()
  payload?: any;

  @ApiPropertyOptional({ description: 'Control values' })
  @IsOptional()
  controlValues?: any;

  @ApiPropertyOptional({ description: 'Associated topics', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @ApiProperty({ description: 'Whether this is a digest workflow run' })
  @IsBoolean()
  isDigest: boolean;

  @ApiPropertyOptional({ description: 'Digested workflow run identifier' })
  @IsOptional()
  @IsString()
  digestedWorkflowRunId?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Step runs for this workflow run',
    type: [StepRunDto],
  })
  @IsOptional()
  @Type(() => StepRunDto)
  steps?: StepRunDto[];
}

export class GetWorkflowRunsResponseDto {
  @ApiProperty({ description: 'Workflow runs data', type: [WorkflowRunDto] })
  @Type(() => WorkflowRunDto)
  data: WorkflowRunDto[];

  @ApiPropertyOptional({ description: 'Next cursor for pagination' })
  @IsString()
  nextCursor: string | null;

  @ApiPropertyOptional({ description: 'Previous cursor for pagination' })
  @IsString()
  previousCursor: string | null;
}
