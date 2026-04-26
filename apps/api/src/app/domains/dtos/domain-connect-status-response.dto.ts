import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpectedDnsRecordDto } from './expected-dns-record.dto';

export enum DomainConnectStatusReasonEnum {
  DISABLED = 'disabled',
  DISCOVERY_NOT_CONFIGURED = 'discovery_not_configured',
  UNSUPPORTED_PROVIDER = 'unsupported_provider',
  INCOMPLETE_CONFIGURATION = 'incomplete_configuration',
  PROVIDER_SETTINGS_UNAVAILABLE = 'provider_settings_unavailable',
  UNTRUSTED_PROVIDER_FLOW = 'untrusted_provider_flow',
  TEMPLATE_NOT_ONBOARDED = 'template_not_onboarded',
}

export class DomainConnectStatusResponseDto {
  @ApiProperty()
  available: boolean;

  @ApiPropertyOptional()
  providerName?: string;

  @ApiPropertyOptional()
  providerId?: string;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional({ enum: DomainConnectStatusReasonEnum })
  reasonCode?: DomainConnectStatusReasonEnum;

  @ApiProperty({ type: [ExpectedDnsRecordDto] })
  manualRecords: ExpectedDnsRecordDto[];
}
