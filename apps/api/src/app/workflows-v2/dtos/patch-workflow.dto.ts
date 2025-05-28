import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class PatchWorkflowDto {
  @ApiPropertyOptional({
    description: 'Activate or deactivate the workflow',
    type: 'boolean',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'New name for the workflow',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the workflow',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Tags associated with the workflow',
    type: 'array',
    items: { type: 'string' },
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'The payload JSON Schema for the workflow',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  payloadSchema?: object;

  @ApiPropertyOptional({
    description: 'Enable or disable payload schema validation',
    type: 'boolean',
  })
  @IsOptional()
  @IsBoolean()
  payloadSchemaValidation?: boolean;
}
