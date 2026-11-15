import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetHumanWhatsAppSetupCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  /** The operator's own dashboard asked: a webhook still to add comes back with its verify token. */
  @IsOptional()
  @IsBoolean()
  fromDashboard?: boolean;
}
