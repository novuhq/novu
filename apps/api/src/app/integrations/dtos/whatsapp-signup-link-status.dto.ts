import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { WhatsAppSignupLinkInvalidReason } from '@novu/shared';

/**
 * Flat OpenAPI projection of the `WhatsAppSignupLinkStatus` discriminated
 * union from `@novu/shared` (Swagger cannot express the union directly):
 * `valid: true` carries the progress fields, `valid: false` carries `reason`.
 */
export class WhatsAppSignupLinkStatusResponseDto {
  @ApiProperty({ type: Boolean, description: 'False when the signup link is expired or invalid' })
  valid: boolean;

  @ApiPropertyOptional({ type: String, enum: ['expired', 'invalid'], description: 'Why the link is not valid' })
  reason?: WhatsAppSignupLinkInvalidReason;

  @ApiPropertyOptional({ type: String, description: 'Display name of the agent this signup link connects' })
  agentName?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'True once the WhatsApp credentials required for sending (access token, phone number ID, WABA ID) are saved on the integration',
  })
  credentialsSaved?: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Human-readable WhatsApp business phone number, used to build wa.me test deep links',
  })
  displayPhoneNumber?: string;
}
