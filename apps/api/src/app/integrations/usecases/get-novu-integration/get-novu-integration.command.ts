import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsString } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';

export class GetNovuIntegrationCommand extends EnvironmentCommand {
  @IsString()
  channelType: ChannelTypeEnum;
}
