import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { UiComponentEnum } from '@novu/shared';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';

export class UiSchemaProperty {
  @ApiPropertyOptional({
    description: 'Placeholder for the UI Schema Property',
    anyOf: [
      {
        type: 'string',
      },
      {
        type: 'number',
      },
      {
        type: 'boolean',
      },
      {
        type: 'object',
        additionalProperties: true,
      },
      {
        type: 'array',
        items: {
          anyOf: [
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'object', additionalProperties: true },
          ],
        },
      },
    ],
    nullable: true,
  })
  @IsOptional()
  placeholder?: unknown;

  @ApiProperty({
    description: 'Component type for the UI Schema Property',
    enum: [...Object.values(UiComponentEnum)],
    enumName: 'UiComponentEnum',
  })
  @IsEnum(UiComponentEnum)
  component: UiComponentEnum;

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
