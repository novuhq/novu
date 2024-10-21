import { IsNotEmpty, IsOptional } from 'class-validator';
import { WorkflowPreferencesPartial } from '@novu/shared';
import { EnvironmentCommand } from '../../commands';

export class UpsertWorkflowPreferencesCommand extends EnvironmentCommand {
  @IsOptional()
  readonly preferences?: WorkflowPreferencesPartial | null;

  @IsNotEmpty()
  templateId: string;
}
