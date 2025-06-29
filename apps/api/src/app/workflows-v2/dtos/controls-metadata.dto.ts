import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';
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

  [key: string]: any;
}
