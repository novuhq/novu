import { IsDefined, IsMongoId } from 'class-validator';
import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class DeleteWorkflowCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  workflowId: string;
}
