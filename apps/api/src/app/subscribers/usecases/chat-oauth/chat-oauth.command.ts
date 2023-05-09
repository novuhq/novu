import { BaseCommand } from '@novu/application-generic';
import { IsEnum, IsMongoId, IsString } from 'class-validator';
import { ChatProviderIdEnum } from '@novu/shared';
import { IsNotEmpty } from '../chat-oauth-callback/chat-oauth-callback.command';

export class ChatOauthCommand extends BaseCommand {
  @IsMongoId()
  @IsString()
  readonly environmentId: string;

  @IsNotEmpty()
  @IsEnum(ChatProviderIdEnum)
  readonly providerId: ChatProviderIdEnum;

  @IsNotEmpty()
  @IsString()
  readonly subscriberId: string;
}
