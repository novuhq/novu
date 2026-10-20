import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ConfirmOperatorEmailCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  code: string;

  /** Relay agent whose operator this is. Defaults to `human-relay`. */
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsOptional()
  @IsString()
  clientIp?: string;
}
