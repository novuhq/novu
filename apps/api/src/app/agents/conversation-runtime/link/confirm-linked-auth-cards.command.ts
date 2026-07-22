import { EnvironmentCommand } from '@novu/application-generic';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

export class ConfirmLinkedAuthCardsCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  /** Mongo `_id` of the integration, used to scope conversations to this channel. */
  @IsString()
  @IsNotEmpty()
  integrationId: string;

  @IsEnum(AgentPlatformEnum)
  platform: AgentPlatformEnum;

  /** Platform-native user id that just linked (e.g. Slack user id, Telegram chat id). */
  @IsString()
  @IsNotEmpty()
  platformUserId: string;
}
