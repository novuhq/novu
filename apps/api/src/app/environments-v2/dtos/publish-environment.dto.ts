import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsNumber, Min, Max } from 'class-validator';

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
