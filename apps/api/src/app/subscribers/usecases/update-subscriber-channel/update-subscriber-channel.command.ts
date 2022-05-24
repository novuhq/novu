import { IsOptional, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { DirectIntegrationId, ISubscriberChannel, IChannelCredentials } from '@novu/shared';
// import { ChannelIdentifier } from '@novu/dal';

export class IChannelCredentialsCommand implements IChannelCredentials {
  @IsString()
  @IsOptional()
  channelId: string;

  @IsString()
  @IsOptional()
  accessToken: string;
}

export class UpdateSubscriberChannelCommand extends EnvironmentCommand implements ISubscriberChannel {
  static create(data: UpdateSubscriberChannelCommand) {
    return CommandHelper.create(UpdateSubscriberChannelCommand, data);
  }
  @IsString()
  subscriberId: string;

  integrationId: DirectIntegrationId;

  credentials: IChannelCredentialsCommand;
}
