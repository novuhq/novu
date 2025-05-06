import { IsBoolean, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { PreferenceLevelEnum } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetPreferencesByLevelCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  subscriberId: string;

  @IsEnum(PreferenceLevelEnum)
  @IsDefined()
  level: PreferenceLevelEnum;

  @IsBoolean()
  @IsDefined()
  includeInactiveChannels: boolean;
}
