import { BaseCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString } from 'class-validator';

export class LinkTelegramChatToSubscriberCommand extends BaseCommand {
  /**
   * The raw `/start <token>` payload received from the Telegram webhook. The
   * usecase verifies it as a subscriber-link JWT, then claims its `jti` as used
   * before creating the channel endpoint.
   */
  @IsString()
  @IsNotEmpty()
  token: string;

  /**
   * The Telegram `chat.id` of the inbound message, which is what
   * `TelegramChatProvider` reads from `endpoint.chatId` when sending outbound
   * notifications.
   */
  @IsString()
  @IsNotEmpty()
  chatId: string;
}
