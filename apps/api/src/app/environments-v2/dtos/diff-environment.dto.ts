import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class DiffEnvironmentRequestDto {
  @ApiProperty({
    description: 'Source environment ID to compare from',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  sourceEnvironmentId: string;

  @ApiProperty({
    description: 'Target environment ID to compare to',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  targetEnvironmentId: string;

  @ApiPropertyOptional({
    description: 'Include inactive workflows in the comparison',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}

export class WorkflowChangeDto {
  @ApiProperty({ description: 'Field that changed' })
  field: string;

  @ApiProperty({ description: 'Old value' })
  old: any;

  @ApiProperty({ description: 'New value' })
  new: any;
}

export class WorkflowDiffDto {
  @ApiProperty({ description: 'Workflow ID' })
  entityId: string;

  @ApiProperty({ description: 'Workflow name' })
  entityName: string;

  @ApiProperty({
    description: 'Type of change',
    enum: ['added', 'modified', 'deleted', 'unchanged'],
  })
  action: 'added' | 'modified' | 'deleted' | 'unchanged';

  @ApiPropertyOptional({
    type: 'object',
    description: 'Detailed changes (only for modified workflows)',
    additionalProperties: {
      type: 'object',
      properties: {
        old: { description: 'Previous value' },
        new: { description: 'New value' },
      },
    },
  })
  changes?: Record<
    string,
    {
      old: any;
      new: any;
    }
  >;
}

export class DiffSummaryDto {
  @ApiProperty({ description: 'Number of added workflows' })
  added: number;

  @ApiProperty({ description: 'Number of modified workflows' })
  modified: number;

  @ApiProperty({ description: 'Number of deleted workflows' })
  deleted: number;

  @ApiProperty({ description: 'Number of unchanged workflows' })
  unchanged: number;
}

export class EntityDiffResultDto {
  @ApiProperty({ description: 'Entity type' })
  entityType: string;

  @ApiProperty({ type: [WorkflowDiffDto], description: 'List of workflow differences' })
  diffs: WorkflowDiffDto[];

  @ApiProperty({ type: DiffSummaryDto, description: 'Summary of changes' })
  summary: DiffSummaryDto;
}

export class EnvironmentDiffSummaryDto {
  @ApiProperty({ description: 'Total number of entities compared' })
  totalEntities: number;

  @ApiProperty({ description: 'Total number of changes detected' })
  totalChanges: number;

  @ApiProperty({ description: 'Whether any changes were detected' })
  hasChanges: boolean;
}

export class DiffEnvironmentResponseDto {
  @ApiProperty({ description: 'Source environment ID' })
  sourceEnvironmentId: string;

  @ApiProperty({ description: 'Target environment ID' })
  targetEnvironmentId: string;

  @ApiProperty({ type: [EntityDiffResultDto], description: 'Diff results by entity type' })
  results: EntityDiffResultDto[];

  @ApiProperty({ type: EnvironmentDiffSummaryDto, description: 'Overall summary' })
  summary: EnvironmentDiffSummaryDto;
}
