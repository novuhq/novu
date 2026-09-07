import { SubscriberEntity } from '@novu/dal';
import { ChatProviderIdEnum, IChannelCredentials, ISubscriberChannel, PushProviderIdEnum } from '@novu/shared';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '../../../commands';
import { OAuthHandlerEnum } from '../types';

export class IChannelCredentialsCommand implements IChannelCredentials {
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsString({ each: true })
  @IsOptional()
  deviceTokens?: string[];

  @IsOptional()
  alertUid?: string;

  @IsOptional()
  title?: string;

  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  state?: string;

  @IsOptional()
  externalUrl?: string;
}

export class UpdateSubscriberChannelCommand extends EnvironmentCommand implements ISubscriberChannel {
  @IsString()
  subscriberId: string;

  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  subscriber?: SubscriberEntity;

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
