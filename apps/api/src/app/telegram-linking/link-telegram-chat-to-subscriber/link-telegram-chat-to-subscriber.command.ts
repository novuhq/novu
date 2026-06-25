import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../shared/commands/project.command';

export class LinkTelegramChatToSubscriberCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationId: string;

  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  /**
   * The Telegram `chat.id` of the inbound message, which is what
   * `TelegramChatProvider` reads from `endpoint.chatId` when sending outbound
   * notifications.
   */
  @IsString()
  @IsNotEmpty()
  chatId: string;
}
