import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetAgentRuntimeConfigCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  @IsString()
  identifier: string;
}
