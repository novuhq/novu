import { IsDefined, IsEnum } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class CreateApplicationCommand extends OrganizationCommand {
  static create(data: CreateApplicationCommand) {
    return CommandHelper.create(CreateApplicationCommand, data);
  }

  @IsDefined()
  name: string;
}
