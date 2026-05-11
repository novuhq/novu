import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfigureWhatsAppWebhookFailureDto {
  @ApiProperty({
    type: String,
    description: 'Machine-readable failure code',
    enum: ['missing_management_scope', 'missing_credentials', 'waba_not_found', 'meta_rejected', 'unknown'],
  })
  code: string;

  @ApiProperty({ type: String, description: 'Human-readable message safe to display in the dashboard' })
  message: string;
}

export class ConfigureWhatsAppWebhookResponseDto {
  @ApiProperty({ type: Boolean, description: 'Whether Novu successfully registered the webhook with Meta' })
  success: boolean;

  @ApiProperty({
    type: String,
    description: 'The callback URL Novu attempted to register with Meta — surface to the user as a fallback',
  })
  callbackUrl: string;

  @ApiPropertyOptional({
    type: String,
    description: 'WhatsApp Business Account ID Meta resolved from the phone number',
  })
  wabaId?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, the dashboard should reveal the manual webhook configuration instructions in Meta',
  })
  fallbackToManual?: boolean;

  @ApiPropertyOptional({ type: ConfigureWhatsAppWebhookFailureDto, description: 'Populated when success is false' })
  reason?: ConfigureWhatsAppWebhookFailureDto;
}
