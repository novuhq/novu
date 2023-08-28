import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

import { LayoutDto } from './layout.dto';

import { LayoutDescription, LayoutId, LayoutIdentifier, LayoutName, LayoutVariables } from '../types';

export class CreateLayoutResponseDto implements Pick<LayoutDto, '_id'> {
  @ApiProperty()
  _id: LayoutId;
}

export class CreateLayoutRequestDto {
  @ApiProperty({
    description: 'User defined custom name and provided by the user that will name the Layout created.',
  })
  @IsString()
  @IsDefined()
  name: LayoutName;

  @ApiProperty({
    description: 'User defined custom key that will be a unique identifier for the Layout created.',
  })
  @IsString()
  @IsDefined()
  identifier: LayoutIdentifier;

  @ApiPropertyOptional({
    description: 'User description of the layout',
  })
  @IsString()
  @IsOptional()
  description: LayoutDescription;

  @ApiProperty({
    description: 'User defined content for the layout.',
  })
  @IsDefined()
  content: string;

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
