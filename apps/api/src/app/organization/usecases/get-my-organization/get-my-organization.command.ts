import { IsDefined } from 'class-validator';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class GetMyOrganizationCommand extends AuthenticatedCommand {
  static create(data: GetMyOrganizationCommand) {
    return CommandHelper.create(GetMyOrganizationCommand, data);
  }

  @IsDefined()
  public readonly id: string;
}
