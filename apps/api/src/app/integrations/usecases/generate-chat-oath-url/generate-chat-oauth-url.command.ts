import { ChatProviderIdEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GenerateChatOauthUrlCommand extends EnvironmentWithSubscriber {
  @IsNotEmpty()
  @IsString()
  readonly integrationIdentifier: string;

  @IsNotEmpty()
  @IsEnum(ChatProviderIdEnum)
  readonly providerId: ChatProviderIdEnum;
}
