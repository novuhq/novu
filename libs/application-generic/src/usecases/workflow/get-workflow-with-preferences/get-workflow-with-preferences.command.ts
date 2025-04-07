import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../commands';

export class GetWorkflowWithPreferencesCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;
}
