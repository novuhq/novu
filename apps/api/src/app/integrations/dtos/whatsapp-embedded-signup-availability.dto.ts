import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type WhatsAppEmbeddedSignupUnavailableReason = 'feature_disabled' | 'missing_platform_config';

export class WhatsAppEmbeddedSignupAvailabilityResponseDto {
  @ApiProperty({
    type: Boolean,
    description: 'True when Meta Embedded Signup can be completed on this deployment for this organization',
  })
  available: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Why embedded signup is unavailable (feature flag off or Meta Tech Provider credentials missing)',
  })
  reason?: WhatsAppEmbeddedSignupUnavailableReason;
}
