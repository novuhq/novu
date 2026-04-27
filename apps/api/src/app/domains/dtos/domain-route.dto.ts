import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainRouteTypeEnum } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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
}
