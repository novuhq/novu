import { IsDefined, IsEnum } from 'class-validator';
import { PreferencesTypeEnum, WorkflowPreferencesPartial } from '@novu/shared';
import { EnvironmentCommand } from '../../commands';

export class UpsertPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: WorkflowPreferencesPartial;

  _subscriberId?: string;

  userId?: string;

  templateId?: string;

  @IsEnum(PreferencesTypeEnum)
  readonly type: PreferencesTypeEnum;
}
