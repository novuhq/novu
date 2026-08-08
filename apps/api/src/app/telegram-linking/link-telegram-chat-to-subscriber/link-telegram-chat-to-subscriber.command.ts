import { IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../shared/commands/project.command';
import type { TelegramLinkScope } from '../telegram-link-scope';

export class LinkTelegramChatToSubscriberCommand extends EnvironmentCommand {
  @IsObject()
  @IsNotEmpty()
  linkScope: TelegramLinkScope;

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

  /**
   * Optional context payload — resolved into keys when `contextKeys` are absent.
   */
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

  /**
   * Pre-resolved context keys persisted verbatim on the created endpoint.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextKeys?: string[];
}
