import { IsNotEmpty } from 'class-validator';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class SwitchOrganizationCommand extends AuthenticatedCommand {
  static create(data: SwitchOrganizationCommand) {
    return CommandHelper.create(SwitchOrganizationCommand, data);
  }

  @IsNotEmpty()
  newOrganizationId: string;
}
