import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetActivityStatsCommand extends EnvironmentWithUserCommand {
  static create(data: GetActivityStatsCommand) {
    return CommandHelper.create<GetActivityStatsCommand>(GetActivityStatsCommand, data);
  }
}
