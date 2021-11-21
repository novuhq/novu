import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class CreateOrganizationCommand extends AuthenticatedCommand {
  static create(data: CreateOrganizationCommand) {
    return CommandHelper.create(CreateOrganizationCommand, data);
  }

  public readonly logo?: string;

  public readonly name: string;
}
