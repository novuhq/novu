import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CompleteVercelIntegrationCommand extends EnvironmentWithUserCommand {
  data: Record<string, string[]>;
  configurationId: string;
}
