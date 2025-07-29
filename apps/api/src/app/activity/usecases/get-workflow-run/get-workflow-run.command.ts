import { IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetWorkflowRunCommand extends EnvironmentWithUserCommand {
  @IsString()
  workflowRunId: string;
}
