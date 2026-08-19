import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfigurePhotonWebhookFailureDto {
  @ApiProperty({
    type: String,
    description: 'Machine-readable failure code',
    enum: ['missing_credentials', 'photon_rejected', 'unknown'],
  })
  code: string;

  @ApiProperty({ type: String, description: 'Human-readable message safe to display in the dashboard' })
  message: string;
}

export class ConfigurePhotonWebhookResponseDto {
  @ApiProperty({
    type: Boolean,
    description: 'Whether the agent inbound URL is registered as a webhook on the Photon project',
  })
  success: boolean;

  @ApiProperty({
    type: String,
    description: 'The callback URL Novu attempted to register with Photon — surface to the user as a fallback',
  })
  callbackUrl: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, the dashboard should reveal the manual webhook configuration instructions for Photon',
  })
  fallbackToManual?: boolean;

  @ApiPropertyOptional({ type: ConfigurePhotonWebhookFailureDto, description: 'Populated when success is false' })
  reason?: ConfigurePhotonWebhookFailureDto;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Other Novu agent webhook URLs already registered on this Photon project (e.g. from another agent, ' +
      'integration, or environment). Every inbound message is delivered to all of them — the dashboard ' +
      'should warn the user and offer to remove the stale entries.',
  })
  existingNovuWebhookUrls?: string[];
}
