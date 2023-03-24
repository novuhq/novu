import { IsEnum } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';

import { EnvironmentCommand } from '../../../shared/commands';

export class CalculateLimitNovuIntegrationCommand extends EnvironmentCommand {
  @IsEnum(ChannelTypeEnum)
  channelType: ChannelTypeEnum;
}
