import { IsDefined, IsMongoId } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetWorkflowVariablesCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  workflowId: string;
}
