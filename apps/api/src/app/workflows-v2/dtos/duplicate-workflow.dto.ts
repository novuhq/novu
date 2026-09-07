import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SLUG_IDENTIFIER_REGEX, slugIdentifierFormatMessage } from '@novu/shared';
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
  @Matches(SLUG_IDENTIFIER_REGEX, {
    message: slugIdentifierFormatMessage('workflowId'),
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
