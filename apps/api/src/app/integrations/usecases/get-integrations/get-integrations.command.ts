import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetIntegrationsCommand extends EnvironmentCommand {
  static create(data: GetIntegrationsCommand) {
    return CommandHelper.create(GetIntegrationsCommand, data);
  }
}
