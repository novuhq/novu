import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class GetActivityStatsCommand extends ApplicationWithUserCommand {
  static create(data: GetActivityStatsCommand) {
    return CommandHelper.create<GetActivityStatsCommand>(GetActivityStatsCommand, data);
  }
}
