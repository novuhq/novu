import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { ResourceTypeEnum, SyncActionEnum } from '../types/sync.types';

export class ResourceToPublishDto {
  @ApiProperty({
    description: 'Type of resource to publish',
    enum: Object.values(ResourceTypeEnum),
    enumName: 'ResourceTypeEnum',
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
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceToPublishDto)
  resources?: ResourceToPublishDto[];
}

export class SyncedWorkflowDto {
  @ApiProperty({
    description: 'Resource type',
    enum: Object.values(ResourceTypeEnum),
    enumName: 'ResourceTypeEnum',
  })
  resourceType: ResourceTypeEnum;

  @ApiProperty({ description: 'Resource ID' })
  resourceId: string;

  @ApiProperty({ description: 'Resource name' })
  resourceName: string;

  @ApiProperty({
    description: 'Sync action performed',
    enum: Object.values(SyncActionEnum),
    enumName: 'SyncActionEnum',
  })
  action: SyncActionEnum;
}

export class FailedWorkflowDto {
  @ApiProperty({
    description: 'Resource type',
    enum: Object.values(ResourceTypeEnum),
    enumName: 'ResourceTypeEnum',
  })
  resourceType: ResourceTypeEnum;

  @ApiProperty({ description: 'Resource ID' })
  resourceId: string;

  @ApiProperty({ description: 'Resource name' })
  resourceName: string;

  @ApiProperty({ description: 'Error message' })
  error: string;

  @ApiPropertyOptional({ description: 'Error stack trace' })
  stack?: string;
}

export class SkippedWorkflowDto {
  @ApiProperty({
    description: 'Resource type',
    enum: Object.values(ResourceTypeEnum),
    enumName: 'ResourceTypeEnum',
  })
  resourceType: ResourceTypeEnum;

  @ApiProperty({ description: 'Resource ID' })
  resourceId: string;

  @ApiProperty({ description: 'Resource name' })
  resourceName: string;

  @ApiProperty({ description: 'Reason for skipping' })
  reason: string;
}

export class SyncResultDto {
  @ApiProperty({
    description: 'Resource type that was synced',
    enum: Object.values(ResourceTypeEnum),
    enumName: 'ResourceTypeEnum',
  })
  resourceType: ResourceTypeEnum;

  @ApiProperty({ type: [SyncedWorkflowDto], description: 'Successfully synced resources' })
  successful: SyncedWorkflowDto[];

  @ApiProperty({ type: [FailedWorkflowDto], description: 'Failed resource syncs' })
  failed: FailedWorkflowDto[];

  @ApiProperty({ type: [SkippedWorkflowDto], description: 'Skipped resources' })
  skipped: SkippedWorkflowDto[];

  @ApiProperty({ description: 'Total number of resources processed' })
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
