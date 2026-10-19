import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SlackSetupLinkStatusResponseDto {
  @ApiProperty({ type: Boolean })
  valid: boolean;

  @ApiPropertyOptional({
    type: String,
    enum: ['expired', 'used', 'invalid'],
    description: 'Populated when valid is false',
  })
  reason?: 'expired' | 'used' | 'invalid';

  @ApiPropertyOptional({ type: String, description: 'Display name of the agent being configured' })
  agentName?: string;

  @ApiPropertyOptional({ type: String, description: 'Provider being configured (always "slack")' })
  providerName?: string;
}
