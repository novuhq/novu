import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { LayoutControlValuesDto } from './layout-controls.dto';

export class UpdateLayoutDto {
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

  @ApiPropertyOptional({
    type: LayoutControlValuesDto,
    nullable: true,
    description:
      'Control values for the layout. Omit to leave unchanged, or set to null to clear stored control values.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LayoutControlValuesDto)
  controlValues?: LayoutControlValuesDto | null;
}
