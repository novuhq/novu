import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

const BOT_TOKEN_PATTERN = /^\d{8,}:[A-Za-z0-9_-]{35,}$/;

export class ConsumeIntegrationStoreTelegramMobileLinkRequestDto {
  @ApiProperty({ type: String, description: 'Signed Telegram mobile-setup token issued by the dashboard' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ type: String, description: 'Bot token issued by BotFather (format: <id>:<secret>)' })
  @IsString()
  @IsNotEmpty()
  @Matches(BOT_TOKEN_PATTERN, {
    message: 'botToken must match the Telegram bot token format',
  })
  botToken: string;
}

export class ConsumeIntegrationStoreTelegramMobileLinkResponseDto {
  @ApiProperty({ type: Boolean })
  success: boolean;

  @ApiProperty({ type: String, description: 'Telegram bot username (without leading @)' })
  botUsername: string;

  @ApiProperty({ type: String, description: 'Internal id of the newly created Telegram integration' })
  integrationId: string;

  @ApiProperty({ type: String, description: 'Human-friendly identifier of the newly created Telegram integration' })
  integrationIdentifier: string;
}
