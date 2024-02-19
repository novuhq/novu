import { IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';
import { ChannelCredentials, SubscriberChannel } from '../../../shared/dtos/subscriber-channel';
import { OAuthHandlerEnum } from '../../types';

export class IChannelCredentialsCommand implements ChannelCredentials {
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsString({ each: true })
  @IsOptional()
  deviceTokens?: string[];
}

export class UpdateSubscriberChannelCommand extends EnvironmentCommand implements SubscriberChannel {
  @IsString()
  subscriberId: string;

  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  @ValidateNested()
  credentials: IChannelCredentialsCommand;

  @IsNotEmpty()
  oauthHandler: OAuthHandlerEnum;

  @IsOptional()
  @IsString()
  integrationIdentifier?: string;

  @IsBoolean()
  isIdempotentOperation: boolean;
}
