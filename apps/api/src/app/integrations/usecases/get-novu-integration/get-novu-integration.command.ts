import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsEnum } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';

export class GetNovuIntegrationCommand extends EnvironmentCommand {
  @IsEnum(ChannelTypeEnum)
  channelType: ChannelTypeEnum;
}
