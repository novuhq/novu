import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpectedDnsRecordDto } from './expected-dns-record.dto';

export class DomainConnectStatusResponseDto {
  @ApiProperty()
  available: boolean;

  @ApiPropertyOptional()
  providerName?: string;

  @ApiPropertyOptional()
  providerId?: string;

  @ApiPropertyOptional()
  reason?: string;

  @ApiProperty({ type: [ExpectedDnsRecordDto] })
  manualRecords: ExpectedDnsRecordDto[];
}
