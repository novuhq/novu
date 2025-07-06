import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ResourceOriginEnum, ResourceTypeEnum, Slug } from '@novu/shared';

import { RuntimeIssueDto } from '../../workflows-v2/dtos/runtime-issue.dto';
import { CreateLayoutDto } from './create-layout.dto';
import { UpdateLayoutDto } from './update-layout.dto';
import { ControlsMetadataDto } from '../../workflows-v2/dtos/controls-metadata.dto';
import { LayoutControlValuesDto } from './layout-controls.dto';

export type LayoutCreateAndUpdateKeys = keyof CreateLayoutDto | keyof UpdateLayoutDto;

class LayoutControlsDto extends ControlsMetadataDto {
  @ApiProperty({ description: 'Email layout controls' })
  @IsOptional()
  values?: LayoutControlValuesDto;
}

@ApiExtraModels(RuntimeIssueDto)
export class LayoutResponseDto {
  @ApiProperty({ description: 'Unique internal identifier of the layout' })
  @IsString()
  _id: string;

  @ApiProperty({ description: 'Unique identifier for the layout' })
  @IsString()
  layoutId: string;

  @ApiProperty({ description: 'Slug of the layout' })
  @IsString()
  slug: Slug;

  @ApiProperty({ description: 'Name of the layout' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Whether the layout is the default layout' })
  @IsBoolean()
  isDefault: boolean;

  @ApiProperty({ description: 'Last updated timestamp' })
  @IsString()
  updatedAt: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsString()
  createdAt: string;

  @ApiProperty({
    description: 'Origin of the layout',
    enum: [...Object.values(ResourceOriginEnum)],
    enumName: 'ResourceOriginEnum',
  })
  @IsEnum(ResourceOriginEnum)
  origin: ResourceOriginEnum;

  @ApiProperty({
    description: 'Type of the layout',
    enum: [...Object.values(ResourceTypeEnum)],
    enumName: 'ResourceTypeEnum',
  })
  @IsEnum(ResourceTypeEnum)
  type: ResourceTypeEnum;

  @ApiPropertyOptional({
    description: 'Runtime issues for layout creation and update',
    type: 'object',
    additionalProperties: {
      $ref: getSchemaPath(RuntimeIssueDto),
    },
  })
  @IsOptional()
  @Type(() => RuntimeIssueDto)
  issues?: Record<LayoutCreateAndUpdateKeys, RuntimeIssueDto>;

  @ApiPropertyOptional({
    description: 'The variables JSON Schema for the layout',
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  @IsOptional()
  variables?: object;

  @ApiProperty({
    description: 'Controls metadata for the layout',
    type: () => LayoutControlsDto,
    required: true,
  })
  @Type(() => LayoutControlsDto)
  controls: LayoutControlsDto;
}
