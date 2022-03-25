import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationCommand } from '../../../shared/commands/project.command';

export class GetActiveIntegrationsCommand extends ApplicationCommand {
  static create(data: GetActiveIntegrationsCommand) {
    return CommandHelper.create(GetActiveIntegrationsCommand, data);
  }
}
