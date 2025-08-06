import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LayoutCreationSourceEnum } from '../types';

export class CreateLayoutDto {
  @ApiProperty({ description: 'Unique identifier for the layout' })
  @IsString()
  layoutId: string;

  @ApiProperty({ description: 'Name of the layout' })
  @IsString()
  name: string;

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
