import { IsDefined, IsNotEmpty } from 'class-validator';
import { WorkflowChannelPreferences } from '@novu/shared';
import { EnvironmentCommand } from '../../commands';

export class UpsertSubscriberGlobalPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: WorkflowChannelPreferences;

  @IsNotEmpty()
  _subscriberId: string;
}
