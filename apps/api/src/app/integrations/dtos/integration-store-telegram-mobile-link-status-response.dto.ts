import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IntegrationStoreTelegramMobileLinkStatusResponseDto {
  @ApiProperty({ type: Boolean })
  valid: boolean;

  @ApiPropertyOptional({
    type: String,
    enum: ['expired', 'used', 'invalid'],
    description: 'Populated when valid is false',
  })
  reason?: 'expired' | 'used' | 'invalid';

  @ApiPropertyOptional({ type: String, description: 'Provider being configured (always "telegram")' })
  providerName?: string;
}
