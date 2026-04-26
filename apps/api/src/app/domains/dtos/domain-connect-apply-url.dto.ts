import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateDomainConnectApplyUrlDto {
  @ApiPropertyOptional({
    description: 'Dashboard URL to return to after the DNS provider consent flow completes.',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false, require_protocol: true })
  redirectUri?: string;
}

export class DomainConnectApplyUrlResponseDto {
  @ApiProperty()
  applyUrl: string;

  @ApiProperty()
  providerName: string;

  @ApiProperty()
  redirectUri: string;
}
