import { IsBoolean, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetWorkflowRunCommand extends EnvironmentWithUserCommand {
  @IsString()
  workflowRunId: string;

  /** Whether execution details keep their raw provider traces, which can hold the provider's credentials. */
  @IsBoolean()
  includeRawTraces: boolean;
}
