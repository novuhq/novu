import { IsDefined, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class DeleteWorkflowCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  workflowIdOrInternalId: string;
}
