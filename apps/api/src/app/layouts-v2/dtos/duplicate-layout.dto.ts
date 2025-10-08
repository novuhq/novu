import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DuplicateLayoutDto {
  @ApiProperty({ description: 'Name of the layout' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Enable or disable translations for this layout',
    required: false,
    default: false,
  })
  @IsOptional()
  isTranslationEnabled?: boolean;
}
