import { ChannelTypeEnum, EnvironmentEnum } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreateNovuIntegrationsCommand extends EnvironmentWithUserCommand {
  name: string | EnvironmentEnum;

  @IsOptional()
  @IsArray()
  @IsEnum(ChannelTypeEnum, { each: true })
  readonly channels?: ChannelTypeEnum[];
}
