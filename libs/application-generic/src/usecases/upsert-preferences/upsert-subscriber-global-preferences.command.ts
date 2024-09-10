import { IsDefined, IsMongoId, IsNotEmpty } from 'class-validator';
import { WorkflowChannelPreferences } from '@novu/shared';
import { EnvironmentCommand } from '../../commands';

export class UpsertSubscriberGlobalPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: WorkflowChannelPreferences;

  @IsNotEmpty()
  @IsMongoId()
  _subscriberId: string;
}
