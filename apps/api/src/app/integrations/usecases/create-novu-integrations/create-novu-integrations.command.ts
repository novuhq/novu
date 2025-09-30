import { ChannelTypeEnum, EnvironmentEnum } from '@novu/shared';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateNovuIntegrationsCommand extends EnvironmentWithUserCommand {
  name: string | EnvironmentEnum;

  @IsOptional()
  @IsArray()
  @IsEnum(ChannelTypeEnum, { each: true })
  readonly channels?: ChannelTypeEnum[];
}
