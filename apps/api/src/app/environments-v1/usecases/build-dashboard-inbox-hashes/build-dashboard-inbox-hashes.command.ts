import { IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class BuildDashboardInboxHashesCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  readonly agentIdentifier?: string;
}
