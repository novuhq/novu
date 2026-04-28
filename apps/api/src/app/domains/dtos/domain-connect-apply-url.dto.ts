import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IsDomainConnectRedirectUrl } from '../validators/domain-connect-redirect-url.validator';

export class CreateDomainConnectApplyUrlDto {
  @ApiPropertyOptional({
    description: 'Dashboard URL to return to after the DNS provider consent flow completes.',
  })
  @IsOptional()
  @IsString()
  @IsDomainConnectRedirectUrl()
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
