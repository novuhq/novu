import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsEnum, IsOptional } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';

export class GetNovuIntegrationCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsEnum(ChannelTypeEnum)
  channelType?: ChannelTypeEnum;
}
