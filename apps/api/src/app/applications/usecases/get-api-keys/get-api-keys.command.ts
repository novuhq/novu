import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class GetApiKeysCommand extends ApplicationWithUserCommand {
  static create(data: GetApiKeysCommand) {
    return CommandHelper.create(GetApiKeysCommand, data);
  }
}
