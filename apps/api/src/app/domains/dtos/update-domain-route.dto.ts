import { ApiPropertyOptional } from '@nestjs/swagger';
import { DomainRouteMatch, DomainRouteTypeEnum } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IsBoundedRecord } from '../validators/bounded-record.validator';
import { IsJsonLogicRule } from '../validators/json-logic-rule.validator';

export class UpdateDomainRouteDto {
  @ApiPropertyOptional({
    description: 'Agent identifier; required when type is agent, ignored when type is webhook.',
  })
  @IsString()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({ enum: DomainRouteTypeEnum })
  @IsEnum(DomainRouteTypeEnum)
  @IsOptional()
  type?: DomainRouteTypeEnum;

  @ApiPropertyOptional({
    description: 'Replaces route metadata when provided (max 10 keys, 500 characters total for keys+values).',
    type: Object,
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsBoundedRecord()
  data?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Optional JSON Logic rule evaluated against inbound mail context. Truthy rules deliver the route.',
    type: Object,
    additionalProperties: true,
  })
  @IsOptional()
  @IsJsonLogicRule()
  match?: DomainRouteMatch | null;
}
