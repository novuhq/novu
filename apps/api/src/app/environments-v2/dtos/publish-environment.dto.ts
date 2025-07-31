import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { ResourceTypeEnum } from '../types/sync.types';

export class ResourceToPublishDto {
  @ApiProperty({
    description: 'Type of resource to publish',
    enum: Object.values(ResourceTypeEnum),
    enumName: 'ResourceTypeEnum',
    example: ResourceTypeEnum.WORKFLOW,
  })
  @IsEnum(ResourceTypeEnum)
  resourceType: ResourceTypeEnum;

  @ApiProperty({
    description: 'Unique identifier of the resource to publish',
    example: 'workflow-id-1',
  })
  @IsString()
  resourceId: string;
}

export class PublishEnvironmentRequestDto {
  @ApiPropertyOptional({
    description: 'Source environment ID to sync from. Defaults to the Development environment if not provided.',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  sourceEnvironmentId?: string;

  @ApiPropertyOptional({
    description: 'Perform a dry run without making actual changes',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({
    description: 'Array of specific resources to publish. If not provided, all resources will be published.',
    type: [ResourceToPublishDto],
    example: [
      { resourceType: 'workflow', resourceId: 'workflow-id-1' },
      { resourceType: 'layout', resourceId: 'layout-id-1' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceToPublishDto)
  resources?: ResourceToPublishDto[];
}

export class SyncedWorkflowDto {
  @ApiProperty({ description: 'Resource type' })
  resourceType: string;

  @ApiProperty({ description: 'Workflow ID' })
  resourceId: string;

  @ApiProperty({ description: 'Workflow name' })
  resourceName: string;

  @ApiProperty({ description: 'Sync action performed' })
  action: 'created' | 'updated' | 'skipped' | 'deleted';
}

export class FailedWorkflowDto {
  @ApiProperty({ description: 'Resource type' })
  resourceType: string;

  @ApiProperty({ description: 'Workflow ID' })
  resourceId: string;

  @ApiProperty({ description: 'Workflow name' })
  resourceName: string;

  @ApiProperty({ description: 'Error message' })
  error: string;

  @ApiPropertyOptional({ description: 'Error stack trace' })
  stack?: string;
}

export class SkippedWorkflowDto {
  @ApiProperty({ description: 'Resource type' })
  resourceType: string;

  @ApiProperty({ description: 'Workflow ID' })
  resourceId: string;

  @ApiProperty({ description: 'Workflow name' })
  resourceName: string;

  @ApiProperty({ description: 'Reason for skipping' })
  reason: string;
}

export class SyncResultDto {
  @ApiProperty({ description: 'Resource type that was synced' })
  resourceType: string;

  @ApiProperty({ type: [SyncedWorkflowDto], description: 'Successfully synced workflows' })
  successful: SyncedWorkflowDto[];

  @ApiProperty({ type: [FailedWorkflowDto], description: 'Failed workflow syncs' })
  failed: FailedWorkflowDto[];

  @ApiProperty({ type: [SkippedWorkflowDto], description: 'Skipped workflows' })
  skipped: SkippedWorkflowDto[];

  @ApiProperty({ description: 'Total number of workflows processed' })
  totalProcessed: number;
}

export class PublishSummaryDto {
  @ApiProperty({ description: 'Number of resources processed' })
  resources: number;

  @ApiProperty({ description: 'Number of successful syncs' })
  successful: number;

  @ApiProperty({ description: 'Number of failed syncs' })
  failed: number;

  @ApiProperty({ description: 'Number of skipped resources' })
  skipped: number;
}

export class PublishEnvironmentResponseDto {
  @ApiProperty({ type: [SyncResultDto], description: 'Sync results by resource type' })
  results: SyncResultDto[];

  @ApiProperty({ type: PublishSummaryDto, description: 'Summary of the sync operation' })
  summary: PublishSummaryDto;
}
