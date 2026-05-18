import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

const BOT_TOKEN_PATTERN = /^\d{8,}:[A-Za-z0-9_-]{35,}$/;

export class ConsumeTelegramMobileLinkRequestDto {
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

export class ConsumeTelegramMobileLinkResponseDto {
  @ApiProperty({ type: Boolean })
  success: boolean;

  @ApiProperty({ type: String, description: 'Telegram bot username (without leading @)' })
  botUsername: string;

  @ApiProperty({ type: String, description: 'Webhook URL Novu registered with Telegram' })
  webhookUrl: string;
}
