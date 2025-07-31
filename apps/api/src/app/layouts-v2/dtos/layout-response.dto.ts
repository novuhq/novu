import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceOriginEnum, ResourceTypeEnum, Slug } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ControlsMetadataDto } from '../../workflows-v2/dtos/controls-metadata.dto';
import { UserResponseDto } from '../../workflows-v2/dtos/user-response.dto';
import { CreateLayoutDto } from './create-layout.dto';
import { LayoutControlValuesDto } from './layout-controls.dto';
import { UpdateLayoutDto } from './update-layout.dto';

export type LayoutCreateAndUpdateKeys = keyof CreateLayoutDto | keyof UpdateLayoutDto;

class LayoutControlsDto extends ControlsMetadataDto {
  @ApiProperty({ description: 'Email layout controls' })
  @IsOptional()
  values?: LayoutControlValuesDto;
}

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

  @ApiPropertyOptional({
    description: 'User who last updated the layout',
    type: () => UserResponseDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserResponseDto)
  updatedBy?: UserResponseDto;

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
