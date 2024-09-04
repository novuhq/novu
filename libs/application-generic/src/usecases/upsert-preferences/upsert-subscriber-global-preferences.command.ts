import { DiscoverWorkflowOutputPreferences } from '@novu/framework';
import { EnvironmentCommand } from '../../commands';
import { IsDefined, IsNotEmpty } from 'class-validator';

export class UpsertSubscriberGlobalPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: DiscoverWorkflowOutputPreferences;

  @IsNotEmpty()
  subscriberId: string;
}
