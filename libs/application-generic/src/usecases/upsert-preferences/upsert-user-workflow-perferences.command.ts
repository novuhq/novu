import { IsNotEmpty } from 'class-validator';
import { UpsertWorkflowPerferencesCommand } from './upsert-workflow-perferences.command';

export class UpsertUserWorkflowPerferencesCommand extends UpsertWorkflowPerferencesCommand {
  @IsNotEmpty()
  userId: string;
}
