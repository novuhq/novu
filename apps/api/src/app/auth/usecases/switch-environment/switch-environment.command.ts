import { IsNotEmpty } from 'class-validator';
import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class SwitchEnvironmentCommand extends OrganizationCommand {
  @IsNotEmpty()
  newEnvironmentId: string;
}
