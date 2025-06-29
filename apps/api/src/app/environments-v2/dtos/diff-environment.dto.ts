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
}

export class ResourceDiffDto {
  @ApiProperty({ description: 'Resource ID (workflow ID or step ID)' })
  @IsString()
  resourceId: string;

  @ApiProperty({ description: 'Resource name (workflow name or step name)' })
  @IsString()
  resourceName: string;

  @ApiProperty({
    description: 'Type of resource',
    enum: ['workflow', 'step'],
  })
  @IsEnum(['workflow', 'step'])
  resourceType: 'workflow' | 'step';

  @ApiProperty({
    description: 'Type of change',
    enum: ['added', 'modified', 'deleted', 'unchanged', 'stepAdded', 'stepModified', 'stepDeleted', 'stepMoved'],
  })
  @IsEnum(['added', 'modified', 'deleted', 'unchanged', 'stepAdded', 'stepModified', 'stepDeleted', 'stepMoved'])
  action: 'added' | 'modified' | 'deleted' | 'unchanged' | 'stepAdded' | 'stepModified' | 'stepDeleted' | 'stepMoved';

  @ApiPropertyOptional({
    type: 'object',
    description: 'Detailed changes (only for modified resources)',
    additionalProperties: {
      type: 'object',
      properties: {
        previous: { description: 'Previous value' },
        new: { description: 'New value' },
      },
    },
  })
  changes?: Record<
    string,
    {
      previous: any;
      new: any;
    }
  >;

  // Step-specific fields
  @ApiPropertyOptional({ description: 'Step type (only for step resources)' })
  @IsOptional()
  @IsString()
  stepType?: string;

  @ApiPropertyOptional({ description: 'Parent workflow ID (only for step resources)' })
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional({ description: 'Parent workflow name (only for step resources)' })
  @IsOptional()
  @IsString()
  workflowName?: string;

  @ApiPropertyOptional({ description: 'Previous index in steps array (for moved/deleted steps)' })
  @IsOptional()
  @IsNumber()
  previousIndex?: number;

  @ApiPropertyOptional({ description: 'New index in steps array (for moved/added steps)' })
  @IsOptional()
  @IsNumber()
  newIndex?: number;
}

export class DiffSummaryDto {
  @ApiProperty({ description: 'Number of added resources (workflows and steps)' })
  @IsNumber()
  added: number;

  @ApiProperty({ description: 'Number of modified resources (workflows and steps)' })
  @IsNumber()
  modified: number;

  @ApiProperty({ description: 'Number of deleted resources (workflows and steps)' })
  @IsNumber()
  deleted: number;

  @ApiProperty({ description: 'Number of unchanged resources (workflows and steps)' })
  @IsNumber()
  unchanged: number;
}

export class ResourceDiffResultDto {
  @ApiProperty({
    description: 'Type of resource being compared',
    enum: ['workflow'],
    example: 'workflow',
  })
  @IsEnum(['workflow'])
  resourceType: string;

  @ApiProperty({
    description: 'ID of the resource being compared',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  resourceId: string;

  @ApiProperty({
    description: 'Name of the resource being compared',
    example: 'Welcome Email Workflow',
  })
  @IsString()
  resourceName: string;

  @ApiProperty({
    description: 'List of specific changes for this resource',
    type: [ResourceDiffDto],
  })
  diffs: ResourceDiffDto[];

  @ApiProperty({
    description: 'Summary of changes for this resource',
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

  @ApiProperty({ type: [ResourceDiffResultDto], description: 'Diff resources by resource type' })
  resources: ResourceDiffResultDto[];

  @ApiProperty({ type: EnvironmentDiffSummaryDto, description: 'Overall summary' })
  summary: EnvironmentDiffSummaryDto;
}
