import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { DomainRouteDto } from './domain-route.dto';

export class UpdateDomainDto {
  @ApiPropertyOptional({ type: [DomainRouteDto], description: 'Full replacement routes array for this domain.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DomainRouteDto)
  @IsOptional()
  routes?: DomainRouteDto[];
}
