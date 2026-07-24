import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

const BOT_TOKEN_PATTERN = /^\d{8,}:[A-Za-z0-9_-]{35,}$/;

export class ConsumeIntegrationStoreTelegramMobileLinkCommand extends BaseCommand {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @Matches(BOT_TOKEN_PATTERN, {
    message: 'botToken must match the Telegram bot token format <id>:<secret>',
  })
  botToken: string;
}

export { BOT_TOKEN_PATTERN };
