import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetVercelConfigurationCommand extends EnvironmentWithUserCommand {
  configurationId: string;
}
