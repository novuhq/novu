import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SetContactCanWakeCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsBoolean()
  canWake: boolean;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}
