import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainRouteTypeEnum, DomainStatusEnum } from '@novu/shared';
import { ExpectedDnsRecordDto } from './expected-dns-record.dto';

export class DomainRouteResponseDto {
  @ApiProperty()
  address: string;

  @ApiPropertyOptional({ description: 'Destination agent ID (only present for agent routes)' })
  destination?: string;

  @ApiProperty({ enum: DomainRouteTypeEnum })
  type: DomainRouteTypeEnum;
}

export class DomainResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: DomainStatusEnum })
  status: DomainStatusEnum;

  @ApiProperty()
  mxRecordConfigured: boolean;

  @ApiPropertyOptional()
  dnsProvider?: string;

  @ApiProperty({ type: [DomainRouteResponseDto] })
  routes: DomainRouteResponseDto[];

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ type: [ExpectedDnsRecordDto] })
  expectedDnsRecords?: ExpectedDnsRecordDto[];
}
