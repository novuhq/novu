import { CommandHelper } from '../../../shared/commands/command.helper';
import { OrganizationCommand } from '../../../shared/commands/organization.command';
import { EnvironmentCommand, EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetNotificationTemplatesCommand extends EnvironmentWithUserCommand {
  static create(data: GetNotificationTemplatesCommand) {
    return CommandHelper.create(GetNotificationTemplatesCommand, data);
  }
}
