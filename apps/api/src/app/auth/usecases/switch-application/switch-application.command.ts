import { IsNotEmpty } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class SwitchApplicationCommand extends OrganizationCommand {
  static create(data: SwitchApplicationCommand) {
    return CommandHelper.create(SwitchApplicationCommand, data);
  }

  @IsNotEmpty()
  newApplicationId: string;
}
