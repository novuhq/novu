import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationCommand } from '../../../shared/commands/project.command';

export class GetIntegrationCommand extends ApplicationCommand {
  static create(data: GetIntegrationCommand) {
    return CommandHelper.create(GetIntegrationCommand, data);
  }
}
