import { IsDefined, IsEnum } from 'class-validator';
import { DiscoverWorkflowOutputPreferences } from '@novu/framework';
import { EnvironmentCommand } from '../../commands';
import { PreferencesActorEnum } from '@novu/dal';

export class UpsertPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: DiscoverWorkflowOutputPreferences;

  subscriberId?: string;

  userId?: string;

  templateId?: string;

  @IsEnum(PreferencesActorEnum)
  readonly actor: PreferencesActorEnum;
}
