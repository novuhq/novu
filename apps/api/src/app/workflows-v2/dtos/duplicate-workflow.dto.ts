import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class DuplicateWorkflowDto {
  @ApiProperty({
    description: 'Name of the workflow',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Custom workflow identifier for the duplicated workflow',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9]+(?:[-_.][a-zA-Z0-9]+)*$/, {
    message: 'workflowId must be a valid slug format (letters, numbers, hyphens, dot and underscores only)',
  })
  workflowId?: string;

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
