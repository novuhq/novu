import { IsDefined, IsEnum } from 'class-validator';
import { DiscoverWorkflowOutputPreferences } from '@novu/framework';
import { EnvironmentCommand } from '../../commands';
import { PreferencesActorEnum } from '@novu/dal';

export class WritePreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: DiscoverWorkflowOutputPreferences;

  readonly subscriberId?: string;

  readonly userId?: string;

  readonly templateId?: string;

  @IsEnum(PreferencesActorEnum)
  readonly actor: PreferencesActorEnum;
}
