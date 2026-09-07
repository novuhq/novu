import { ApiProperty } from '@nestjs/swagger';

export class ConfigureTelegramWebhookResponseDto {
  @ApiProperty({ type: String, description: 'URL Novu registered with Telegram for incoming updates' })
  webhookUrl: string;

  @ApiProperty({ type: String, description: 'ISO-8601 timestamp the webhook was configured at' })
  configuredAt: string;

  @ApiProperty({ type: String, description: 'Resolved bot username from getMe' })
  botUsername: string;
}
