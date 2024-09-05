import { IsNotEmpty } from 'class-validator';
import { UpsertWorkflowPreferencesCommand } from './upsert-workflow-preferences.command';

export class UpsertUserWorkflowPreferencesCommand extends UpsertWorkflowPreferencesCommand {
  @IsNotEmpty()
  userId: string;
}
