import { ApiPropertyOptional } from '@nestjs/swagger';
import { DomainRouteTypeEnum } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

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
}
