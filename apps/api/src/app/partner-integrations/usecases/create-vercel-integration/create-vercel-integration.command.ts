import { IsDefined } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateVercelIntegrationCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  vercelIntegrationCode: string;
  @IsDefined()
  configurationId: string;
}
