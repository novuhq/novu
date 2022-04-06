import { IsDefined, IsEnum } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class CreateEnvironmentCommand extends OrganizationCommand {
  static create(data: CreateEnvironmentCommand) {
    return CommandHelper.create(CreateEnvironmentCommand, data);
  }

  @IsDefined()
  name: string;
}
