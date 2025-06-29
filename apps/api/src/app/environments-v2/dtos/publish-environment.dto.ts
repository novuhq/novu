import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class PublishEnvironmentRequestDto {
  @ApiProperty({
    description: 'Source environment ID to sync from',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  sourceEnvironmentId: string;

  @ApiProperty({
    description: 'Target environment ID to sync to',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  targetEnvironmentId: string;

  @ApiPropertyOptional({
    description: 'Perform a dry run without making actual changes',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({
    description: 'Skip workflows that already exist in target environment',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipExisting?: boolean;

  @ApiPropertyOptional({
    description: 'Include inactive workflows in the sync',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;

  @ApiPropertyOptional({
    description: 'Batch size for processing workflows',
    default: 100,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  batchSize?: number;
}

export class SyncedWorkflowDto {
  @ApiProperty({ description: 'Entity type' })
  entityType: string;

  @ApiProperty({ description: 'Workflow ID' })
  entityId: string;

  @ApiProperty({ description: 'Workflow name' })
  entityName: string;

  @ApiProperty({ description: 'Sync action performed' })
  action: 'created' | 'updated' | 'skipped' | 'deleted';

  @ApiProperty({ description: 'Duration in milliseconds' })
  duration: number;
}

export class FailedWorkflowDto {
  @ApiProperty({ description: 'Entity type' })
  entityType: string;

  @ApiProperty({ description: 'Workflow ID' })
  entityId: string;

  @ApiProperty({ description: 'Workflow name' })
  entityName: string;

  @ApiProperty({ description: 'Error message' })
  error: string;

  @ApiPropertyOptional({ description: 'Error stack trace' })
  stack?: string;
}

export class SkippedWorkflowDto {
  @ApiProperty({ description: 'Entity type' })
  entityType: string;

  @ApiProperty({ description: 'Workflow ID' })
  entityId: string;

  @ApiProperty({ description: 'Workflow name' })
  entityName: string;

  @ApiProperty({ description: 'Reason for skipping' })
  reason: string;
}

export class SyncResultDto {
  @ApiProperty({ description: 'Entity type that was synced' })
  entityType: string;

  @ApiProperty({ type: [SyncedWorkflowDto], description: 'Successfully synced workflows' })
  successful: SyncedWorkflowDto[];

  @ApiProperty({ type: [FailedWorkflowDto], description: 'Failed workflow syncs' })
  failed: FailedWorkflowDto[];

  @ApiProperty({ type: [SkippedWorkflowDto], description: 'Skipped workflows' })
  skipped: SkippedWorkflowDto[];

  @ApiProperty({ description: 'Total number of workflows processed' })
  totalProcessed: number;

  @ApiProperty({ description: 'Total time taken in milliseconds' })
  totalTime: number;
}

export class PublishSummaryDto {
  @ApiProperty({ description: 'Total number of entities processed' })
  totalEntities: number;

  @ApiProperty({ description: 'Total number of successful syncs' })
  totalSuccessful: number;

  @ApiProperty({ description: 'Total number of failed syncs' })
  totalFailed: number;

  @ApiProperty({ description: 'Total number of skipped entities' })
  totalSkipped: number;

  @ApiProperty({ description: 'Total duration in milliseconds' })
  totalDuration: number;
}

export class PublishEnvironmentResponseDto {
  @ApiProperty({ type: [SyncResultDto], description: 'Sync results by entity type' })
  results: SyncResultDto[];

  @ApiProperty({ type: PublishSummaryDto, description: 'Summary of the sync operation' })
  summary: PublishSummaryDto;
}
