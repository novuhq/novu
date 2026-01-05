import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { RulesLogic } from 'json-logic-js';
import { ScheduleDto } from '../../shared/dtos/schedule';

export class UpdatePreferencesRequestDto {
  @IsOptional()
  @IsBoolean()
  readonly email?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly sms?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly in_app?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly chat?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly push?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDto)
  readonly schedule?: ScheduleDto;

  @ApiProperty({
    description: 'Whether the preference is enabled',
    type: Boolean,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  readonly enabled?: boolean;

  @ApiProperty({
    description: 'Condition using JSON Logic rules',
    type: 'object',
    additionalProperties: true,
    example: { and: [{ '===': [{ var: 'tier' }, 'premium'] }] },
  })
  @IsObject()
  @IsOptional()
  readonly condition?: RulesLogic;
}
