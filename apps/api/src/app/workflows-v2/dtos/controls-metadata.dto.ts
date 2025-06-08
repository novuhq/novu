import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { JSONSchemaDto } from './json-schema.dto';
import { UiSchema } from './ui-schema.dto';

export class ControlsMetadataDto {
  @ApiPropertyOptional({
    description: 'JSON Schema for data',
    additionalProperties: true,
    type: () => Object,
  })
  @IsOptional()
  @ValidateNested()
  dataSchema?: JSONSchemaDto;

  @ApiPropertyOptional({
    description: 'UI Schema for rendering',
    type: UiSchema,
  })
  @IsOptional()
  @ValidateNested()
  uiSchema?: UiSchema;

  @ApiProperty({
    description: 'Control values',
    type: 'object',
    additionalProperties: true,
  })
  values: Record<string, unknown>;
}
