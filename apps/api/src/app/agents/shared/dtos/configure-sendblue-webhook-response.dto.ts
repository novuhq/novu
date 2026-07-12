import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfigureSendblueWebhookFailureDto {
  @ApiProperty({
    type: String,
    description: 'Machine-readable failure code',
    enum: ['missing_credentials', 'sendblue_rejected', 'unknown'],
  })
  code: string;

  @ApiProperty({ type: String, description: 'Human-readable message safe to display in the dashboard' })
  message: string;
}

export class ConfigureSendblueWebhookResponseDto {
  @ApiProperty({ type: Boolean, description: 'Whether Novu successfully registered the receive webhook with Sendblue' })
  success: boolean;

  @ApiProperty({
    type: String,
    description: 'The callback URL Novu attempted to register with Sendblue — surface to the user as a fallback',
  })
  callbackUrl: string;

  @ApiPropertyOptional({
    type: String,
    description:
      'The webhook signing secret provisioned for this integration. Shown so the user can configure the webhook manually in the Sendblue dashboard when auto-registration fails.',
  })
  webhookSecret?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, the dashboard should reveal the manual webhook configuration instructions for Sendblue',
  })
  fallbackToManual?: boolean;

  @ApiPropertyOptional({ type: ConfigureSendblueWebhookFailureDto, description: 'Populated when success is false' })
  reason?: ConfigureSendblueWebhookFailureDto;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Other Novu agent webhook URLs already registered on this Sendblue account (e.g. from another agent, ' +
      'integration, or environment). Sendblue webhooks are account-level, so every inbound message triggers ' +
      'all of them — the dashboard should warn the user and offer to remove the stale entries.',
  })
  existingNovuWebhookUrls?: string[];
}
