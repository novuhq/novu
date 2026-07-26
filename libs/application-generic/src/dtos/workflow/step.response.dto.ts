import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type ContentOverrideProviderId, ResourceOriginEnum, Slug, StepTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsEnum, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { JSONSchemaDto } from '../json-schema.dto';
import { StepIssuesDto } from '../step-issues.dto';
import { ProviderOverridesDto } from './provider-overrides.dto';

export class StepResponseDto<T = Record<string, unknown>> {
  @ApiProperty({
    description: 'Controls metadata for the step',
    type: () => ControlsMetadataDto,
    required: true,
  })
  @ValidateNested()
  @Type(() => ControlsMetadataDto)
  controls: ControlsMetadataDto;

  @ApiPropertyOptional({
    description: 'Control values for the step (alias for controls.values)',
    type: 'object',
    additionalProperties: true,
  })
  controlValues?: T;

  @ApiPropertyOptional({
    description:
      'Per-provider content overrides keyed by providerId. Stored separately from controlValues and merged over the default body at send time.',
    type: () => ProviderOverridesDto,
    nullable: true,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProviderOverridesDto)
  providerOverrides?: Partial<Record<ContentOverrideProviderId, Record<string, unknown>>> | null;

  @ApiProperty({
    description: 'JSON Schema for variables, follows the JSON Schema standard',
    additionalProperties: true,
    type: () => Object, // Use arrow function for type
  })
  @ValidateNested() // Consider adding options if needed
  @Type(() => JSONSchemaDto) // Import class-transformer decorator
  variables: JSONSchemaDto;

  @ApiProperty({ description: 'Unique identifier of the step' })
  @IsString()
  stepId: string;

  @ApiProperty({ description: 'Database identifier of the step' })
  @IsString()
  _id: string;

  @ApiProperty({ description: 'Name of the step' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Slug of the step', type: 'string' })
  @IsString()
  slug: Slug;

  @ApiProperty({
    description: 'Type of the step',
    enum: [...Object.values(StepTypeEnum)],
    enumName: 'StepTypeEnum',
  })
  @IsEnum(StepTypeEnum)
  type: StepTypeEnum;

  @ApiProperty({
    description: 'Origin of the step',
    enum: [...Object.values(ResourceOriginEnum)],
    enumName: 'ResourceOriginEnum',
  })
  @IsEnum(ResourceOriginEnum)
  origin: ResourceOriginEnum;

  @ApiProperty({ description: 'Workflow identifier' })
  @IsString()
  workflowId: string;

  @ApiProperty({ description: 'Workflow database identifier' })
  @IsString()
  workflowDatabaseId: string;

  @ApiPropertyOptional({
    description: 'Issues associated with the step',
    type: () => StepIssuesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StepIssuesDto)
  issues?: StepIssuesDto;

  @ApiPropertyOptional({
    description: 'Hash identifying the deployed Cloudflare Worker for this step',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  stepResolverHash?: string;
}
