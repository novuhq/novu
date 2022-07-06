import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { DirectProviderIdEnum, ISubscriberChannel, IChannelCredentials } from '@novu/shared';

export class IChannelCredentialsCommand implements IChannelCredentials {
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @IsString({ each: true })
  @IsOptional()
  notificationIdentifiers?: string[];
}

export class UpdateSubscriberChannelCommand extends EnvironmentCommand implements ISubscriberChannel {
  static create(data: UpdateSubscriberChannelCommand) {
    return CommandHelper.create(UpdateSubscriberChannelCommand, data);
  }
  @IsString()
  subscriberId: string;

  providerId: DirectProviderIdEnum;

  @ValidateNested()
  credentials: IChannelCredentialsCommand;
}
