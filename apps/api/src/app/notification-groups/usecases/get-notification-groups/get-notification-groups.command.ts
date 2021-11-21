import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class GetNotificationGroupsCommand extends ApplicationWithUserCommand {
  static create(data: GetNotificationGroupsCommand) {
    return CommandHelper.create<GetNotificationGroupsCommand>(GetNotificationGroupsCommand, data);
  }
}
