import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetNotificationGroupsCommand extends EnvironmentWithUserCommand {
  static create(data: GetNotificationGroupsCommand) {
    return CommandHelper.create<GetNotificationGroupsCommand>(GetNotificationGroupsCommand, data);
  }
}
