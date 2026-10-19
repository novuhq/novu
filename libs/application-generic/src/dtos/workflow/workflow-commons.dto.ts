import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { IsValidJsonSchema } from '../../decorators/json-schema.validator';
import { WorkflowAgentConfigDto } from './workflow-agent-config.dto';

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
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsValidJsonSchema({
    message: 'payloadSchema must be a valid JSON schema',
    nullable: true,
  })
  payloadSchema?: object | null;

  @ApiPropertyOptional({
    description: 'Enable or disable translations for this workflow',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTranslationEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      "Optional agent assignment used to route this workflow through an agent's connected channels. Pass null to clear.",
    type: () => WorkflowAgentConfigDto,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => WorkflowAgentConfigDto)
  agent?: WorkflowAgentConfigDto | null;
}
