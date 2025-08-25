import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DependencyReasonEnum, ResourceTypeEnum } from '../types/sync.types';

export class DiffEnvironmentRequestDto {
  @ApiPropertyOptional({
    description: 'Source environment ID to compare from. Defaults to the Development environment if not provided.',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  sourceEnvironmentId?: string;
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

export class ResourceInfoDto {
  @ApiPropertyOptional({
    description: 'Resource ID (workflow ID or step ID)',
    nullable: true,
    example: 'welcome-email-workflow',
  })
  @IsOptional()
  @IsString()
  id: string | null;

  @ApiPropertyOptional({
    description: 'Resource name (workflow name or step name)',
    nullable: true,
    example: 'Welcome Email Workflow',
  })
  @IsOptional()
  @IsString()
  name: string | null;

  @ApiPropertyOptional({
    description: 'User who last updated the resource',
    type: () => UserInfoDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserInfoDto)
  updatedBy?: UserInfoDto | null;

  @ApiPropertyOptional({
    description: 'When the resource was last updated',
    type: 'string',
    format: 'date-time',
    nullable: true,
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  updatedAt?: string | null;
}

export class ResourceDiffDto {
  @ApiPropertyOptional({
    description: 'Source resource information',
    type: () => ResourceInfoDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceInfoDto)
  sourceResource?: ResourceInfoDto | null;

  @ApiPropertyOptional({
    description: 'Target resource information',
    type: () => ResourceInfoDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceInfoDto)
  targetResource?: ResourceInfoDto | null;

  @ApiProperty({
    description: 'Type of resource',
    enum: [...Object.values(ResourceTypeEnum)],
    enumName: 'ResourceTypeEnum',
    example: 'workflow',
  })
  @IsEnum(ResourceTypeEnum)
  resourceType: ResourceTypeEnum;

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

export class ResourceDependencyDto {
  @ApiProperty({
    description: 'Type of dependent resource',
    enum: [...Object.values(ResourceTypeEnum)],
    enumName: 'ResourceTypeEnum',
    example: 'layout',
  })
  @IsEnum(ResourceTypeEnum)
  resourceType: ResourceTypeEnum;

  @ApiProperty({
    description: 'ID of the dependent resource',
    example: 'layout-id-123',
  })
  @IsString()
  resourceId: string;

  @ApiProperty({
    description: 'Name of the dependent resource',
    example: 'Email Layout Template',
  })
  @IsString()
  resourceName: string;

  @ApiProperty({
    description: 'Whether this dependency blocks the operation',
    example: true,
  })
  @IsBoolean()
  isBlocking: boolean;

  @ApiProperty({
    description: 'Reason for the dependency',
    enum: [...Object.values(DependencyReasonEnum)],
    enumName: 'DependencyReasonEnum',
    example: 'LAYOUT_REQUIRED_FOR_WORKFLOW',
  })
  @IsEnum(DependencyReasonEnum)
  reason: DependencyReasonEnum;
}

export class ResourceDiffResultDto {
  @ApiProperty({
    description: 'Type of resource being compared',
    enum: [...Object.values(ResourceTypeEnum)],
    enumName: 'ResourceTypeEnum',
    example: 'workflow',
  })
  @IsEnum(ResourceTypeEnum)
  resourceType: ResourceTypeEnum;

  @ApiPropertyOptional({
    description: 'Source resource information',
    type: () => ResourceInfoDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceInfoDto)
  sourceResource?: ResourceInfoDto | null;

  @ApiPropertyOptional({
    description: 'Target resource information',
    type: () => ResourceInfoDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceInfoDto)
  targetResource?: ResourceInfoDto | null;

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
    description: 'Dependencies that affect this resource',
    type: [ResourceDependencyDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ResourceDependencyDto)
  dependencies?: ResourceDependencyDto[];
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
