import { IsNotEmpty } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class SwitchEnvironmentCommand extends OrganizationCommand {
  static create(data: SwitchEnvironmentCommand) {
    return CommandHelper.create(SwitchEnvironmentCommand, data);
  }

  @IsNotEmpty()
  newEnvironmentId: string;
}
