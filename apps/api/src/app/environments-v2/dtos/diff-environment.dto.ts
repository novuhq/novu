import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

export class UserInfoDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  _id: string;

  @ApiProperty({ description: 'User first name' })
  @IsString()
  firstName: string;

  @ApiPropertyOptional({ description: 'User last name' })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({ description: 'User external ID' })
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class ResourceDiffDto {
  @ApiPropertyOptional({
    description: 'Source resource ID (workflow ID or step ID)',
    nullable: true,
    example: 'welcome-email-workflow',
  })
  @IsOptional()
  @IsString()
  sourceResourceId: string | null;

  @ApiPropertyOptional({
    description: 'Source resource name (workflow name or step name)',
    nullable: true,
    example: 'Welcome Email Workflow',
  })
  @IsOptional()
  @IsString()
  sourceResourceName: string | null;

  @ApiPropertyOptional({
    description: 'Target resource ID (workflow ID or step ID)',
    nullable: true,
    example: 'welcome-email-workflow',
  })
  @IsOptional()
  @IsString()
  targetResourceId: string | null;

  @ApiPropertyOptional({
    description: 'Target resource name (workflow name or step name)',
    nullable: true,
    example: 'Welcome Email Workflow',
  })
  @IsOptional()
  @IsString()
  targetResourceName: string | null;

  @ApiProperty({
    description: 'Type of resource',
    enum: ['workflow', 'step'],
  })
  @IsEnum(['workflow', 'step'])
  resourceType: 'workflow' | 'step';

  @ApiProperty({
    description: 'Type of change',
    enum: ['added', 'modified', 'deleted', 'unchanged', 'moved'],
  })
  @IsEnum(['added', 'modified', 'deleted', 'unchanged', 'moved'])
  action: 'added' | 'modified' | 'deleted' | 'unchanged' | 'moved';

  @ApiPropertyOptional({
    type: 'object',
    description: 'Detailed changes (only for modified resources)',
    properties: {
      previous: {
        type: 'object',
        description: 'Previous state of the resource (null for added resources)',
        additionalProperties: true,
        nullable: true,
      },
      new: {
        type: 'object',
        description: 'New state of the resource (null for deleted resources)',
        additionalProperties: true,
        nullable: true,
      },
    },
  })
  diffs?: {
    previous: Record<string, any> | null;
    new: Record<string, any> | null;
  };

  // Step-specific fields
  @ApiPropertyOptional({ description: 'Step type (only for step resources)' })
  @IsOptional()
  @IsString()
  stepType?: string;

  @ApiPropertyOptional({ description: 'Previous index in steps array (for moved/deleted steps)' })
  @IsOptional()
  @IsNumber()
  previousIndex?: number;

  @ApiPropertyOptional({ description: 'New index in steps array (for moved/added steps)' })
  @IsOptional()
  @IsNumber()
  newIndex?: number;

  @ApiPropertyOptional({
    description: 'User who last updated the source resource',
    type: () => UserInfoDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserInfoDto)
  sourceResourceUpdatedBy?: UserInfoDto | null;

  @ApiPropertyOptional({
    description: 'User who last updated the target resource',
    type: () => UserInfoDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserInfoDto)
  targetResourceUpdatedBy?: UserInfoDto | null;
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

  @ApiPropertyOptional({
    description: 'Source resource ID',
    nullable: true,
    example: 'welcome-email-workflow',
  })
  @IsOptional()
  @IsString()
  sourceResourceId: string | null;

  @ApiPropertyOptional({
    description: 'Source resource name',
    nullable: true,
    example: 'Welcome Email Workflow',
  })
  @IsOptional()
  @IsString()
  sourceResourceName: string | null;

  @ApiPropertyOptional({
    description: 'Target resource ID',
    nullable: true,
    example: 'welcome-email-workflow',
  })
  @IsOptional()
  @IsString()
  targetResourceId: string | null;

  @ApiPropertyOptional({
    description: 'Target resource name',
    nullable: true,
    example: 'Welcome Email Workflow',
  })
  @IsOptional()
  @IsString()
  targetResourceName: string | null;

  @ApiProperty({
    description: 'List of specific changes for this resource',
    type: [ResourceDiffDto],
  })
  changes: ResourceDiffDto[];

  @ApiProperty({
    description: 'Summary of changes for this resource',
    type: DiffSummaryDto,
  })
  summary: DiffSummaryDto;

  @ApiPropertyOptional({
    description: 'User who last updated the source resource',
    type: () => UserInfoDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserInfoDto)
  sourceResourceUpdatedBy?: UserInfoDto | null;

  @ApiPropertyOptional({
    description: 'User who last updated the target resource',
    type: () => UserInfoDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserInfoDto)
  targetResourceUpdatedBy?: UserInfoDto | null;
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
