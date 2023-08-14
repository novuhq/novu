import { ChannelTypeEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DisableNovuIntegrationCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsEnum(ChannelTypeEnum)
  channel: ChannelTypeEnum;

  @IsDefined()
  @IsString()
  providerId: string;
}
