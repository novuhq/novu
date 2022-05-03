import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CountChangesCommand extends EnvironmentWithUserCommand {
  static create(data: CountChangesCommand) {
    return CommandHelper.create(CountChangesCommand, data);
  }
}
