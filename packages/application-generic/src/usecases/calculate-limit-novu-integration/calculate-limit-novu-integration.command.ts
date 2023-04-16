import { IsEnum } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';

import { EnvironmentCommand } from '../../commands/project.command';

export class CalculateLimitNovuIntegrationCommand extends EnvironmentCommand {
  @IsEnum(ChannelTypeEnum)
  channelType: ChannelTypeEnum;
}
