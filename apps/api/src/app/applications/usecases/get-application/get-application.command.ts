import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class GetApplicationCommand extends ApplicationWithUserCommand {
  static create(data: GetApplicationCommand) {
    return CommandHelper.create(GetApplicationCommand, data);
  }
}
