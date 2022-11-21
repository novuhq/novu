import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateVercelConfigurationCommand extends EnvironmentWithUserCommand {
  data: Record<string, string[]>;
  configurationId: string;
}
