import { IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class TestClaudeManagedAgentCommand extends EnvironmentWithUserCommand {
  @IsString()
  agentIdentifier: string;
}
