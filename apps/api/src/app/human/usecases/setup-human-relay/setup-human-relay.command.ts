import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SetupHumanRelayCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
