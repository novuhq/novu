import { IsOptional, IsBoolean } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetActiveIntegrationsCommand extends EnvironmentWithUserCommand {
  @IsBoolean()
  @IsOptional()
  returnCredentials?: boolean;
}
