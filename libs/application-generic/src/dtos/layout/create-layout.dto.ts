import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { LayoutCreationSourceEnum } from '../../types';

export class CreateLayoutDto {
  @ApiProperty({ description: 'Unique identifier for the layout' })
  @IsString()
  layoutId: string;

  @ApiProperty({ description: 'Name of the layout' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Enable or disable translations for this layout',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTranslationEnabled?: boolean;

  @ApiProperty({
    description: 'Source of layout creation',
    enum: LayoutCreationSourceEnum,
    enumName: 'LayoutCreationSourceEnum',
    required: false,
    default: LayoutCreationSourceEnum.DASHBOARD,
  })
  @IsOptional()
  @IsEnum(LayoutCreationSourceEnum)
  __source?: LayoutCreationSourceEnum;
}
