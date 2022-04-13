import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetActiveIntegrationsCommand extends EnvironmentCommand {
  static create(data: GetActiveIntegrationsCommand) {
    return CommandHelper.create(GetActiveIntegrationsCommand, data);
  }
}
