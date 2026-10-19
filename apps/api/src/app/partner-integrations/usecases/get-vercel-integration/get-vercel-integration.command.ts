import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetVercelIntegrationCommand extends EnvironmentWithUserCommand {
  configurationId: string;
}
