import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsObject, IsOptional } from 'class-validator';
import { RulesLogic } from 'json-logic-js';

export class UpdateSubscriptionPreferencesRequestDto {
  @ApiProperty({
    description: 'Whether the preference is enabled',
    type: Boolean,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({
    description: 'Condition using JSON Logic rules',
    type: 'object',
    additionalProperties: true,
    example: { and: [{ '===': [{ var: 'tier' }, 'premium'] }] },
  })
  @IsObject()
  @IsOptional()
  condition?: RulesLogic;
}
