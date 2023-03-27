import { IsEnum, IsOptional } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../../shared/commands';

export class GetNovuIntegrationCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsEnum(ChannelTypeEnum)
  channelType?: ChannelTypeEnum;
}
