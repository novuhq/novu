import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DuplicateLayoutDto {
  @ApiProperty({ description: 'Name of the layout' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Identifier for the duplicated layout. When omitted, it is derived from the name.',
  })
  @IsOptional()
  @IsString()
  layoutId?: string;

  @ApiPropertyOptional({
    description: 'Enable or disable translations for this layout',
    required: false,
    default: false,
  })
  @IsOptional()
  isTranslationEnabled?: boolean;
}
