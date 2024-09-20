import { IsDefined, IsNotEmpty } from 'class-validator';
import { WorkflowPreferences } from '@novu/shared';
import { EnvironmentCommand } from '../../commands';

export class UpsertWorkflowPreferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: WorkflowPreferences;

  @IsNotEmpty()
  templateId: string;
}
