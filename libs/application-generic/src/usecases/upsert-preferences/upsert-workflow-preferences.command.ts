import { EnvironmentCommand } from '../../commands';
import { IsDefined, IsNotEmpty } from 'class-validator';
import { WorkflowChannelPreferences } from '@novu/shared';

export class UpsertWorkflowPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: WorkflowChannelPreferences;

  @IsNotEmpty()
  templateId: string;
}
