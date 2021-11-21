import { CommandHelper } from '../../../shared/commands/command.helper';
import { OrganizationCommand } from '../../../shared/commands/organization.command';
import { ApplicationCommand, ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class GetNotificationTemplatesCommand extends ApplicationWithUserCommand {
  static create(data: GetNotificationTemplatesCommand) {
    return CommandHelper.create(GetNotificationTemplatesCommand, data);
  }
}
