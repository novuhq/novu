import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  ChatProviderIdEnum,
  IChannelCredentials,
  PushProviderIdEnum,
} from '@novu/shared';
import { SubscriberEntity } from '@novu/dal';
import { EnvironmentCommand } from '../../../commands';
import { OAuthHandlerEnum } from '../types';

export class SubscriberChannel {
  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  credentials: IChannelCredentials;
}

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

export class UpdateSubscriberChannelCommand
  extends EnvironmentCommand
  implements SubscriberChannel
{
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
