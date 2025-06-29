import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber } from 'class-validator';

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

export class EntityDiffDto {
  @ApiProperty({ description: 'Entity ID (workflow ID or step ID)' })
  @IsString()
  entityId: string;

  @ApiProperty({ description: 'Entity name (workflow name or step name)' })
  @IsString()
  entityName: string;

  @ApiProperty({
    description: 'Type of entity',
    enum: ['workflow', 'step'],
  })
  @IsEnum(['workflow', 'step'])
  entityType: 'workflow' | 'step';

  @ApiProperty({
    description: 'Type of change',
    enum: ['added', 'modified', 'deleted', 'unchanged', 'stepAdded', 'stepModified', 'stepDeleted', 'stepMoved'],
  })
  @IsEnum(['added', 'modified', 'deleted', 'unchanged', 'stepAdded', 'stepModified', 'stepDeleted', 'stepMoved'])
  action: 'added' | 'modified' | 'deleted' | 'unchanged' | 'stepAdded' | 'stepModified' | 'stepDeleted' | 'stepMoved';

  @ApiPropertyOptional({
    type: 'object',
    description: 'Detailed changes (only for modified entities)',
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

  // Step-specific fields
  @ApiPropertyOptional({ description: 'Step type (only for step entities)' })
  @IsOptional()
  @IsString()
  stepType?: string;

  @ApiPropertyOptional({ description: 'Parent workflow ID (only for step entities)' })
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional({ description: 'Parent workflow name (only for step entities)' })
  @IsOptional()
  @IsString()
  workflowName?: string;

  @ApiPropertyOptional({ description: 'Previous index in steps array (for moved/deleted steps)' })
  @IsOptional()
  @IsNumber()
  oldIndex?: number;

  @ApiPropertyOptional({ description: 'New index in steps array (for moved/added steps)' })
  @IsOptional()
  @IsNumber()
  newIndex?: number;
}

export class DiffSummaryDto {
  @ApiProperty({ description: 'Number of added workflows' })
  @IsNumber()
  added: number;

  @ApiProperty({ description: 'Number of modified workflows' })
  @IsNumber()
  modified: number;

  @ApiProperty({ description: 'Number of deleted workflows' })
  @IsNumber()
  deleted: number;

  @ApiProperty({ description: 'Number of unchanged workflows' })
  @IsNumber()
  unchanged: number;

  @ApiProperty({ description: 'Number of added steps' })
  @IsNumber()
  stepAdded: number;

  @ApiProperty({ description: 'Number of modified steps' })
  @IsNumber()
  stepModified: number;

  @ApiProperty({ description: 'Number of deleted steps' })
  @IsNumber()
  stepDeleted: number;

  @ApiProperty({ description: 'Number of moved steps' })
  @IsNumber()
  stepMoved: number;
}

export class EntityDiffResultDto {
  @ApiProperty({
    description: 'Type of entity being compared',
    enum: ['workflow'],
    example: 'workflow',
  })
  @IsEnum(['workflow'])
  entityType: string;

  @ApiProperty({
    description: 'ID of the entity being compared',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  entityId: string;

  @ApiProperty({
    description: 'Name of the entity being compared',
    example: 'Welcome Email Workflow',
  })
  @IsString()
  entityName: string;

  @ApiProperty({
    description: 'List of specific changes for this entity',
    type: [EntityDiffDto],
  })
  diffs: EntityDiffDto[];

  @ApiProperty({
    description: 'Summary of changes for this entity',
    type: DiffSummaryDto,
  })
  summary: DiffSummaryDto;
}

export class EnvironmentDiffSummaryDto {
  @ApiProperty({ description: 'Total number of entities compared' })
  @IsNumber()
  totalEntities: number;

  @ApiProperty({ description: 'Total number of changes detected' })
  @IsNumber()
  totalChanges: number;

  @ApiProperty({ description: 'Whether any changes were detected' })
  @IsBoolean()
  hasChanges: boolean;
}

export class DiffEnvironmentResponseDto {
  @ApiProperty({ description: 'Source environment ID' })
  @IsString()
  sourceEnvironmentId: string;

  @ApiProperty({ description: 'Target environment ID' })
  @IsString()
  targetEnvironmentId: string;

  @ApiProperty({ type: [EntityDiffResultDto], description: 'Diff results by entity type' })
  results: EntityDiffResultDto[];

  @ApiProperty({ type: EnvironmentDiffSummaryDto, description: 'Overall summary' })
  summary: EnvironmentDiffSummaryDto;
}
