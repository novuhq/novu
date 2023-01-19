import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsEnum } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';

export class GetNovuIntegrationCommand extends EnvironmentWithUserCommand {
  @IsEnum(ChannelTypeEnum)
  channelType: ChannelTypeEnum;
}
