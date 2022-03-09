import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationCommand } from '../../../shared/commands/project.command';

export class GetIntegrationsCommand extends ApplicationCommand {
  static create(data: GetIntegrationsCommand) {
    return CommandHelper.create(GetIntegrationsCommand, data);
  }
}
