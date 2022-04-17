import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetApiKeysCommand extends EnvironmentWithUserCommand {
  static create(data: GetApiKeysCommand) {
    return CommandHelper.create(GetApiKeysCommand, data);
  }
}
