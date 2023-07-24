import { IsEnum, IsOptional } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class GetNovuIntegrationCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsEnum(ChannelTypeEnum)
  channelType?: ChannelTypeEnum;
}
