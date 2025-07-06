import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class DuplicateWorkflowDto {
  @ApiProperty({
    description: 'Name of the workflow',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Tags associated with the workflow',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'Description of the workflow',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Enable or disable translations for this workflow',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTranslationEnabled?: boolean;
}
