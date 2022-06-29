import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetFeedsCommand extends EnvironmentWithUserCommand {
  static create(data: GetFeedsCommand) {
    return CommandHelper.create<GetFeedsCommand>(GetFeedsCommand, data);
  }
}
