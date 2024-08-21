import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { LayoutDto } from './layout.dto';

import { LayoutVariables } from '../types';

export class UpdateLayoutResponseDto extends LayoutDto {}

export class UpdateLayoutRequestDto {
  @ApiPropertyOptional({
    description: 'User defined custom name and provided by the user that will name the Layout updated.',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'User defined custom key that will be a unique identifier for the Layout updated.',
  })
  @IsString()
  @IsOptional()
  identifier: string;

  @ApiPropertyOptional({
    description: 'User defined description of the layout',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'User defined content for the layout.',
  })
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'User defined variables to render in the layout placeholders.',
  })
  @IsOptional()
  variables?: LayoutVariables;

  @ApiPropertyOptional({
    description: 'Variable that defines if the layout is chosen as default when creating a layout.',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
