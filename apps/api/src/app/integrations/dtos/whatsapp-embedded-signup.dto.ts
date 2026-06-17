import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import type { ConfigureWhatsAppWebhookFailure } from '../../agents/channels/whatsapp/configure-whatsapp-webhook/configure-whatsapp-webhook.usecase';

export class WhatsAppEmbeddedSignupRequestDto {
  @ApiProperty({
    type: String,
    description: 'Authorization code returned by Meta Embedded Signup via the Facebook JS SDK',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ type: String, description: 'WhatsApp Business Account ID from the WA_EMBEDDED_SIGNUP session event' })
  @IsString()
  @IsNotEmpty()
  wabaId: string;

  @ApiProperty({ type: String, description: 'Phone number ID from the WA_EMBEDDED_SIGNUP session event' })
  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @ApiProperty({ type: String, description: 'Identifier of the WhatsApp integration to update' })
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @ApiProperty({ type: String, description: 'Agent identifier used to configure the webhook callback URL' })
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;
}

export type WhatsAppEmbeddedSignupFailure = {
  code:
    | 'feature_disabled'
    | 'missing_platform_config'
    | 'token_exchange_failed'
    | 'meta_validation_failed'
    | 'integration_not_found'
    | 'phone_registration_failed'
    | 'webhook_configuration_failed'
    | 'unknown';
  message: string;
};

export class WhatsAppEmbeddedSignupFailureDto {
  @ApiProperty({ type: String })
  code: WhatsAppEmbeddedSignupFailure['code'];

  @ApiProperty({ type: String })
  message: string;
}

export class WhatsAppEmbeddedSignupResponseDto {
  @ApiProperty({ type: Boolean })
  success: boolean;

  @ApiPropertyOptional({ type: String })
  integrationId?: string;

  @ApiPropertyOptional({ type: String })
  integrationIdentifier?: string;

  @ApiPropertyOptional({ type: String })
  callbackUrl?: string;

  @ApiPropertyOptional({ type: String })
  wabaId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Human-readable WhatsApp business phone number saved on the integration for onboarding deep links',
  })
  displayPhoneNumber?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Present when phone registration failed but credentials were saved',
  })
  phoneRegistrationWarning?: string;

  @ApiPropertyOptional({ type: WhatsAppEmbeddedSignupFailureDto })
  error?: WhatsAppEmbeddedSignupFailure;

  @ApiPropertyOptional({
    type: Object,
    description: 'Populated when webhook auto-configure fails after credentials save',
  })
  webhookReason?: ConfigureWhatsAppWebhookFailure;
}
