import { IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class RegisterDiscoveredAgentCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  identifier: string;

  @IsString()
  @IsOptional()
  description?: string;
}
