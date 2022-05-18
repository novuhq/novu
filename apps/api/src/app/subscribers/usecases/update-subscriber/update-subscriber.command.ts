import { IsEmail, IsOptional, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IUpdateSubscriberDto, DirectIntegrationId, ISubscriberChannel, IChannelCredentials } from '@novu/shared';

export class IChannelCredentialsCommand implements IChannelCredentials {
  @IsString()
  @IsOptional()
  channelId: string;

  @IsString()
  @IsOptional()
  accessToken: string;
}

export class IChannelCommand implements ISubscriberChannel {
  @IsString()
  @IsOptional()
  integrationId: DirectIntegrationId;

  @IsOptional()
  credentials: IChannelCredentialsCommand;
}

export class UpdateSubscriberCommand extends EnvironmentCommand implements IUpdateSubscriberDto {
  static create(data: UpdateSubscriberCommand) {
    return CommandHelper.create(UpdateSubscriberCommand, data);
  }

  @IsString()
  subscriberId: string;

  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsOptional()
  channel?: IChannelCommand;
}
