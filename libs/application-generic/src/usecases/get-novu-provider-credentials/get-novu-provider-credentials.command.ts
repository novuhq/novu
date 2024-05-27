import { IsEnum, IsString } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class GetNovuProviderCredentialsCommand extends EnvironmentWithUserCommand {
  @IsEnum(ChannelTypeEnum)
  channelType: ChannelTypeEnum;

  @IsString()
  providerId: string;
}
