import { OrganizationCommand } from '@novu/application-generic';
import { IsNotEmpty } from 'class-validator';

export class SwitchEnvironmentCommand extends OrganizationCommand {
  @IsNotEmpty()
  newEnvironmentId: string;
}
