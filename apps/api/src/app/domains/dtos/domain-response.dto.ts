import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainStatusEnum } from '@novu/shared';
import { ExpectedDnsRecordDto } from './expected-dns-record.dto';

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

  @ApiPropertyOptional({
    description: 'String key-value metadata (max 10 keys, 500 characters total when set via API).',
    type: Object,
    additionalProperties: { type: 'string' },
  })
  data?: Record<string, string>;
}
