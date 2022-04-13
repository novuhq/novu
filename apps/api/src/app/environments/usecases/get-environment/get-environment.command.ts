import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetEnvironmentCommand extends EnvironmentWithUserCommand {
  static create(data: GetEnvironmentCommand) {
    return CommandHelper.create(GetEnvironmentCommand, data);
  }
}
