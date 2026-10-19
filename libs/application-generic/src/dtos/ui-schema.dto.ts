import { ApiExtraModels, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { UiSchemaGroupEnum } from '@novu/shared';
import { IsOptional, ValidateNested } from 'class-validator';
import { UiSchemaProperty } from './ui-schema-property.dto';

@ApiExtraModels(UiSchemaProperty)
export class UiSchema {
  @ApiPropertyOptional({
    description: 'Group of the UI Schema',
    enum: [...Object.values(UiSchemaGroupEnum)],
    enumName: 'UiSchemaGroupEnum',
  })
  @IsOptional()
  group?: UiSchemaGroupEnum;

  @ApiPropertyOptional({
    description: 'Properties of the UI Schema',
    type: 'object',
    additionalProperties: {
      $ref: getSchemaPath(UiSchemaProperty),
    },
  })
  @IsOptional()
  @ValidateNested()
  properties?: Record<string, UiSchemaProperty>;
}
