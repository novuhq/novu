import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { DirectProviderIdEnum, PushProviderIdEnum } from '@novu/shared';
import { ChannelCredentials, SubscriberChannel } from '../../../shared/dtos/subscriber-channel';

export class IChannelCredentialsCommand implements ChannelCredentials {
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @IsString({ each: true })
  @IsOptional()
  notificationIdentifiers?: string[];
}

export class UpdateSubscriberChannelCommand extends EnvironmentCommand implements SubscriberChannel {
  @IsString()
  subscriberId: string;

  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  @ValidateNested()
  credentials: IChannelCredentialsCommand;
}
