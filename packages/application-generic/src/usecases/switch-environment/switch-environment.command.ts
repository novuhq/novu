import { IsNotEmpty } from 'class-validator';
import { OrganizationCommand } from '../../commands';

export class SwitchEnvironmentCommand extends OrganizationCommand {
  @IsNotEmpty()
  newEnvironmentId: string;
}
