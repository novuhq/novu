import { IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateHumanAgentCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
