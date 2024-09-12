import { IsDefined, IsEnum } from 'class-validator';
import { EnvironmentCommand } from '../../commands';
import { PreferencesActorEnum, PreferencesTypeEnum } from '@novu/dal';
import { WorkflowChannelPreferences } from '@novu/shared';

export class UpsertPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: WorkflowChannelPreferences;

  subscriberId?: string;

  userId?: string;

  templateId?: string;

  @IsEnum(PreferencesActorEnum)
  readonly actor: PreferencesActorEnum;

  @IsEnum(PreferencesTypeEnum)
  readonly type: PreferencesTypeEnum;
}
