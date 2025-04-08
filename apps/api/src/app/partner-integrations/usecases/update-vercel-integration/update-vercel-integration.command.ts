import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateVercelIntegrationCommand extends EnvironmentWithUserCommand {
  data: Record<string, string[]>;
  configurationId: string;
}
