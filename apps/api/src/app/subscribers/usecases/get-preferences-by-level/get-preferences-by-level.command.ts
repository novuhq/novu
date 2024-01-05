import { IsDefined, IsEnum, IsString } from 'class-validator';
import { PreferenceLevelEnum } from '@novu/dal';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetPreferencesByLevelCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  subscriberId: string;

  @IsEnum(PreferenceLevelEnum)
  @IsDefined()
  level: PreferenceLevelEnum;
}
