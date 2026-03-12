import { ChannelTypeEnum } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class GetNovuProviderCredentialsCommand extends EnvironmentWithUserCommand {
  @IsEnum(ChannelTypeEnum)
  channelType: ChannelTypeEnum;

  @IsString()
  providerId: string;

  @IsOptional()
  @IsString()
  recipientEmail?: string;
}
