import { ApiProperty, ApiPropertyOptional, ApiPropertyOptions, getSchemaPath } from '@nestjs/swagger';
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
    /**
     * Your notification system starts with email and sms, then you add push notifications.
     * Without forward compatibility, SDK users on older versions see errors until they upgrade.
     * With forward compatibility enabled, they receive the value gracefully.
     * @see https://www.speakeasy.com/blog/typescript-forward-compatibility#forward-compatible-enums
     */
    'x-speakeasy-unknown-values': 'allow',
  } as unknown as ApiPropertyOptions)
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
