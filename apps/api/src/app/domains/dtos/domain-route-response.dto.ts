import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainRouteTypeEnum } from '@novu/shared';

export class DomainRouteResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  _domainId: string;

  @ApiProperty()
  address: string;

  @ApiPropertyOptional({ description: 'Destination agent ID (only present for agent routes)' })
  destination?: string;

  @ApiProperty({ enum: DomainRouteTypeEnum })
  type: DomainRouteTypeEnum;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
