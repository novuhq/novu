import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainRouteTypeEnum } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsBoundedRecord } from '../validators/bounded-record.validator';
import { IsEmailLocalPart } from '../validators/email-local-part.validator';

export class DomainRouteDto {
  @ApiProperty({ description: 'Inbox address local part (e.g. "support", "*")' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @IsNotEmpty()
  @IsEmailLocalPart()
  address: string;

  @ApiPropertyOptional({
    description: 'Agent identifier; required when type is agent, unused for webhook',
  })
  @IsString()
  @IsOptional()
  agentId?: string;

  @ApiProperty({ enum: DomainRouteTypeEnum })
  @IsEnum(DomainRouteTypeEnum)
  type: DomainRouteTypeEnum;

  @ApiPropertyOptional({
    description: 'Optional string key-value metadata (max 10 keys, 500 characters total for keys+values).',
    type: Object,
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsBoundedRecord()
  data?: Record<string, string>;
}
