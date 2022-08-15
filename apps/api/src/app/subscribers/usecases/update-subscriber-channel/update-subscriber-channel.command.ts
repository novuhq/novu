import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { ChatProviderIdEnum, ISubscriberChannel, IChannelCredentials, PushProviderIdEnum } from '@novu/shared';

export class IChannelCredentialsCommand implements IChannelCredentials {
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @IsString({ each: true })
  @IsOptional()
  notificationIdentifiers?: string[];
}

export class UpdateSubscriberChannelCommand extends EnvironmentCommand implements ISubscriberChannel {
  @IsString()
  subscriberId: string;

  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  @ValidateNested()
  credentials: IChannelCredentialsCommand;
}
