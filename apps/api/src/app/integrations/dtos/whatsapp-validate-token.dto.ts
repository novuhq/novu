import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import type { WhatsAppValidateTokenError } from '../usecases/whatsapp/whatsapp-validate-token.usecase';

export class WhatsAppValidateTokenRequestDto {
  @ApiProperty({ type: String, description: 'WhatsApp Cloud API access token to validate against the Meta Graph API' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Optional WhatsApp Business phone number ID to verify the access token can read it',
  })
  @IsString()
  @IsOptional()
  phoneNumberIdentification?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Optional WhatsApp Business Account ID — when supplied, Novu confirms the phone number belongs to it',
  })
  @IsString()
  @IsOptional()
  businessAccountId?: string;
}

export class WhatsAppValidateTokenErrorDto {
  @ApiProperty({
    type: String,
    description: 'Machine-readable error code',
    enum: [
      'invalid_token',
      'expired_token',
      'phone_not_found',
      'phone_mismatch',
      'waba_not_accessible',
      'waba_phone_mismatch',
      'missing_messaging_scope',
      'unknown',
    ],
  })
  code: WhatsAppValidateTokenError['code'];

  @ApiProperty({ type: String, description: 'Human-readable error message safe to surface in the UI' })
  message: string;
}

export class WhatsAppValidateTokenResponseDto {
  @ApiProperty({ type: Boolean, description: 'Whether the access token (and phone number, if supplied) is usable' })
  valid: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the access token has the `whatsapp_business_management` scope required for auto-configure',
  })
  hasManagementScope: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the access token has the `whatsapp_business_messaging` scope required for outbound messages',
  })
  hasMessagingScope: boolean;

  @ApiProperty({ type: [String], description: 'Flattened list of OAuth scopes granted on the access token' })
  scopes: string[];

  @ApiPropertyOptional({
    type: Number,
    description: 'Unix epoch (seconds) when the access token expires; omitted for never-expiring tokens',
  })
  expiresAt?: number;

  @ApiPropertyOptional({ type: String, description: 'WhatsApp Business Account ID resolved from the phone number' })
  wabaId?: string;

  @ApiPropertyOptional({ type: String, description: 'Phone number ID echoed back from Meta' })
  phoneNumberId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Display phone number associated with the WhatsApp Business account',
  })
  displayPhoneNumber?: string;

  @ApiPropertyOptional({ type: String, description: 'Verified business name associated with the phone number' })
  verifiedName?: string;

  @ApiPropertyOptional({ type: WhatsAppValidateTokenErrorDto, description: 'Populated when validation fails' })
  error?: WhatsAppValidateTokenErrorDto;
}
