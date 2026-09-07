import { ChannelTypeEnum } from '@novu/shared';
import { IsEnum } from 'class-validator';

import { EnvironmentCommand } from '../../commands/project.command';

export class CalculateLimitNovuIntegrationCommand extends EnvironmentCommand {
  @IsEnum(ChannelTypeEnum)
  channelType: ChannelTypeEnum;
}
