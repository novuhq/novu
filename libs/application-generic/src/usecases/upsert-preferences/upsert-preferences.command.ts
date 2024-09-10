import { IsDefined, IsEnum } from 'class-validator';
import { PreferencesActorEnum, PreferencesTypeEnum } from '@novu/dal';
import { WorkflowChannelPreferences } from '@novu/shared';
import { EnvironmentCommand } from '../../commands';

export class UpsertPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: WorkflowChannelPreferences;

  _subscriberId?: string;

  userId?: string;

  templateId?: string;

  @IsEnum(PreferencesActorEnum)
  readonly actor: PreferencesActorEnum;

  @IsEnum(PreferencesTypeEnum)
  readonly type: PreferencesTypeEnum;
}
