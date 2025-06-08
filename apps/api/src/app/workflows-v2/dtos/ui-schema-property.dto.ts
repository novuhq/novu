import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UiComponentEnum } from '@novu/shared';

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
}
