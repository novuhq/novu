import { OrganizationCommand } from '../../../../../shared/commands/organization.command';
import { CommandHelper } from '../../../../../shared/commands/command.helper';

export class GetMembersCommand extends OrganizationCommand {
  static create(data: GetMembersCommand) {
    return CommandHelper.create(GetMembersCommand, data);
  }
}
