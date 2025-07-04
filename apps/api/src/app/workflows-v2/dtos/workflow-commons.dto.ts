import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { IsValidJsonSchema } from '../../shared/validators/json-schema.validator';

export class WorkflowCommonsFields {
  @ApiProperty({ description: 'Name of the workflow' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the workflow', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Tags associated with the workflow',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether the workflow is active',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable payload schema validation',
    type: 'boolean',
  })
  @IsOptional()
  @IsBoolean()
  validatePayload?: boolean;

  @ApiPropertyOptional({
    description: 'The payload JSON Schema for the workflow',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsValidJsonSchema({
    message: 'payloadSchema must be a valid JSON schema',
  })
  payloadSchema?: object;

  @ApiPropertyOptional({
    description: 'Enable or disable translations for this workflow',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTranslationEnabled?: boolean;
}
