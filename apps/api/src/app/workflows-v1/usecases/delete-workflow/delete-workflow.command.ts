import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export class DeleteWorkflowCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;
}
