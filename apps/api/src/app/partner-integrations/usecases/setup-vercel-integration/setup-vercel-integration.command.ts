import { IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SetupVercelIntegrationCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  vercelIntegrationCode: string;
}
