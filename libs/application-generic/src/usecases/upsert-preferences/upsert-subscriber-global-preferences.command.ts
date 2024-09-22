import { IsDefined, IsMongoId, IsNotEmpty } from 'class-validator';
import { WorkflowPreferencesPartial } from '@novu/shared';
import { EnvironmentCommand } from '../../commands';

export class UpsertSubscriberGlobalPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: WorkflowPreferencesPartial;

  @IsNotEmpty()
  @IsMongoId()
  _subscriberId: string;
}
