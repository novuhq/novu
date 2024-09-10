import { EnvironmentCommand } from '../../commands';
import { IsDefined, IsNotEmpty } from 'class-validator';
import { WorkflowChannelPreferences } from '@novu/shared';

export class UpsertSubscriberGlobalPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: WorkflowChannelPreferences;

  @IsNotEmpty()
  subscriberId: string;
}
