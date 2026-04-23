import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainRouteTypeEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DomainRouteDto {
  @ApiProperty({ description: 'Email address prefix (e.g. "support", "*")' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ description: 'Destination agent ID (required when type is agent, unused for webhook)' })
  @IsString()
  @IsOptional()
  destination?: string;

  @ApiProperty({ enum: DomainRouteTypeEnum })
  @IsEnum(DomainRouteTypeEnum)
  type: DomainRouteTypeEnum;
}
