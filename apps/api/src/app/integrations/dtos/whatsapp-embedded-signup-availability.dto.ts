import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WhatsAppEmbeddedSignupUnavailableReason } from '@novu/shared';

export type { WhatsAppEmbeddedSignupUnavailableReason };

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
