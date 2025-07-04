import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';

export class GetWorkflowWithPreferencesCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;
}
