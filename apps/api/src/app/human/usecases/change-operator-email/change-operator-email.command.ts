import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ChangeOperatorEmailCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  address: string;

  /** Relay agent whose operator this is. Defaults to `human-relay`. */
  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}
