import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WhatsAppSignupStatusResponseDto {
  @ApiProperty({
    type: Boolean,
    description:
      'True once the WhatsApp credentials required for sending (access token, phone number ID, WABA ID) are saved on the integration',
  })
  credentialsSaved: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Human-readable WhatsApp business phone number, used to build wa.me test deep links',
  })
  displayPhoneNumber?: string;
}
