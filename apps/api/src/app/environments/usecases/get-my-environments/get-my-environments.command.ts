import { CommandHelper } from '../../../shared/commands/command.helper';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class GetMyEnvironmentsCommand extends OrganizationCommand {
  static create(data: GetMyEnvironmentsCommand) {
    return CommandHelper.create(GetMyEnvironmentsCommand, data);
  }
}
